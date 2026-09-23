import { Injectable } from "@nestjs/common";
import type { AiProcessResult } from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { ConflictError, NotFoundError } from "../../common/api-error";
import {
  serializeParticipant,
  serializeSummary,
  serializeTopic,
  serializeUtterance,
} from "../../common/serialize";

@Injectable()
export class TranscriptService {
  constructor(private readonly prisma: PrismaService) {}

  async getTranscript(meetingId: string) {
    const [participants, utterances] = await Promise.all([
      this.prisma.participant.findMany({ where: { meetingId } }),
      this.prisma.utterance.findMany({
        where: { meetingId },
        orderBy: { order: "asc" },
      }),
    ]);
    return {
      meetingId,
      participants: participants.map(serializeParticipant),
      utterances: utterances.map(serializeUtterance),
    };
  }

  async getTopics(meetingId: string) {
    const topics = await this.prisma.topic.findMany({
      where: { meetingId },
      orderBy: { order: "asc" },
    });
    return topics.map(serializeTopic);
  }

  async getSummary(meetingId: string, topicId?: string) {
    const summaries = await this.prisma.summary.findMany({
      where: { meetingId, topicId: topicId ?? null },
    });
    return summaries.map(serializeSummary);
  }

  async updateParticipant(id: string, data: { fullName?: string; role?: string }) {
    const p = await this.prisma.participant.update({ where: { id }, data });
    return serializeParticipant(p);
  }

  /**
   * Персистит результат AI worker'а (после STT + диаризации + извлечения
   * поручений + сегментации по темам) внутри одной транзакции.
   * Speaker tags / topic order из AI-контракта мапятся на реальные id.
   */
  async saveProcessingResult(meetingId: string, result: AiProcessResult) {
    return this.prisma.$transaction(async (tx) => {
      // The status change and all result rows commit together. A repeated or
      // concurrent callback observes READY and cannot append duplicate rows.
      const claimed = await tx.meeting.updateMany({
        where: { id: meetingId, status: { in: ["UPLOADED", "PROCESSING"] } },
        data: {
          status: "READY",
          ...(result.durationSec !== undefined ? { durationSec: result.durationSec } : {}),
        },
      });
      if (claimed.count === 0) {
        const meeting = await tx.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new NotFoundError("Meeting", meetingId);
        if (meeting.status === "READY") return { participants: 0, topics: 0, duplicate: true };
        throw new ConflictError(`Meeting is ${meeting.status}, result cannot be saved`);
      }

      // 1. participants (upsert по speakerTag)
      const speakerToParticipantId = new Map<string, string>();
      for (const s of result.speakers) {
        const p = await tx.participant.upsert({
          where: { meetingId_speakerTag: { meetingId, speakerTag: s.speakerTag } },
          create: {
            meetingId,
            speakerTag: s.speakerTag,
            fullName: s.fullNameGuess ?? null,
            role: s.roleGuess ?? null,
          },
          update: {
            fullName: s.fullNameGuess ?? undefined,
            role: s.roleGuess ?? undefined,
          },
        });
        speakerToParticipantId.set(s.speakerTag, p.id);
      }

      // 2. topics
      const orderToTopicId = new Map<number, string>();
      for (const t of result.topics) {
        const topic = await tx.topic.create({
          data: {
            meetingId,
            title: t.title,
            order: t.order,
            startOrder: t.startUtteranceOrder,
            endOrder: t.endUtteranceOrder,
          },
        });
        orderToTopicId.set(t.order, topic.id);
      }

      // 3. utterances (bulk)
      if (result.utterances.length) {
        await tx.utterance.createMany({
          data: result.utterances.map((u) => ({
            meetingId,
            participantId: speakerToParticipantId.get(u.speakerTag) ?? null,
            text: u.text,
            startMs: u.startMs,
            endMs: u.endMs,
            order: u.order,
          })),
        });
      }
      const savedUtterances = await tx.utterance.findMany({
        where: { meetingId },
        orderBy: { order: "asc" },
      });
      const orderToUtteranceId = new Map(savedUtterances.map((u) => [u.order, u.id]));

      // 4. tasks
      for (const t of result.tasks) {
        await tx.task.create({
          data: {
            meetingId,
            topicId: t.topicOrder != null ? orderToTopicId.get(t.topicOrder) ?? null : null,
            description: t.description,
            responsibleId: t.responsibleSpeakerTag
              ? speakerToParticipantId.get(t.responsibleSpeakerTag) ?? null
              : null,
            responsibleRaw: t.responsibleRaw ?? null,
            dueDate: t.dueDateIso ? new Date(t.dueDateIso) : null,
            dueRaw: t.dueRaw ?? null,
            sourceUtteranceId:
              t.sourceUtteranceOrder != null
                ? orderToUtteranceId.get(t.sourceUtteranceOrder) ?? null
                : null,
          },
        });
      }

      // 5. summaries
      for (const s of result.summaries) {
        await tx.summary.create({
          data: {
            meetingId,
            topicId: s.topicOrder != null ? orderToTopicId.get(s.topicOrder) ?? null : null,
            text: s.text,
          },
        });
      }

      return { participants: speakerToParticipantId.size, topics: orderToTopicId.size };
    });
  }
}
