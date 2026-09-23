import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { Packer } from "docx";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundError } from "../../common/api-error";
import { serializeExport } from "../../common/serialize";
import { buildProtocolDocument, ProtocolTopic } from "./protocol-docx.builder";
import { writeProtocolPdf } from "./protocol-pdf.builder";
import type { Env } from "../../config/env.schema";

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(meetingId: string, format: "PDF" | "DOCX") {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundError("Meeting", meetingId);

    const [topics, tasks, utterances, participants, summaries] = await Promise.all([
      this.prisma.topic.findMany({ where: { meetingId }, orderBy: { order: "asc" } }),
      this.prisma.task.findMany({ where: { meetingId }, include: { responsible: true } }),
      this.prisma.utterance.findMany({
        where: { meetingId },
        orderBy: { order: "asc" },
        include: { participant: true },
      }),
      this.prisma.participant.findMany({ where: { meetingId } }),
      this.prisma.summary.findMany({ where: { meetingId } }),
    ]);

    const topicList: ProtocolTopic[] =
      topics.length > 0
        ? topics.map((t) => ({
            title: t.title,
            utterances: utterances
              .filter((u) => isUtteranceInTopicRange(u.order, t.startOrder, t.endOrder))
              .map((u) => ({
                speakerName: u.participant?.fullName ?? u.participant?.speakerTag ?? "Неизвестный",
                speakerRole: u.participant?.role ?? null,
                text: u.text,
              })),
            tasks: tasks
              .filter((task) => task.topicId === t.id)
              .map((task) => ({
                description: task.description,
                responsible: task.responsible?.fullName ?? task.responsibleRaw ?? "—",
                due: task.dueRaw ?? (task.dueDate ? task.dueDate.toLocaleDateString("ru-RU") : "—"),
              })),
            summary: summaries.find((s) => s.topicId === t.id)?.text ?? null,
          }))
        : [
            {
              title: meeting.title,
              utterances: utterances.map((u) => ({
                speakerName: u.participant?.fullName ?? u.participant?.speakerTag ?? "Неизвестный",
                speakerRole: u.participant?.role ?? null,
                text: u.text,
              })),
              tasks: tasks.map((task) => ({
                description: task.description,
                responsible: task.responsible?.fullName ?? task.responsibleRaw ?? "—",
                due: task.dueRaw ?? (task.dueDate ? task.dueDate.toLocaleDateString("ru-RU") : "—"),
              })),
              summary: null,
            },
          ];

    const overallSummary = summaries.find((s) => s.topicId === null)?.text ?? null;

    const protocol = {
      title: meeting.title,
      organization: meeting.organization,
      createdAt: meeting.createdAt,
      topics: topicList,
      overallSummary,
    };

    const dir = this.config.get("EXPORT_STORAGE_DIR", { infer: true });
    fs.mkdirSync(dir, { recursive: true });
    let fileUrl: string;
    if (format === "PDF") {
      fileUrl = path.join(dir, `${meetingId}.pdf`);
      await writeProtocolPdf(protocol, fileUrl);
    } else {
      fileUrl = path.join(dir, `${meetingId}.docx`);
      const doc = buildProtocolDocument(protocol);
      fs.writeFileSync(fileUrl, await Packer.toBuffer(doc));
    }

    const exportRecord = await this.prisma.export.create({
      data: { meetingId, format, fileUrl },
    });
    return serializeExport(exportRecord);
  }

  async download(exportId: string) {
    const exportRecord = await this.prisma.export.findUnique({ where: { id: exportId } });
    if (!exportRecord) throw new NotFoundError("Export", exportId);
    return exportRecord;
  }
}

function isUtteranceInTopicRange(order: number, startOrder: number | null, endOrder: number | null): boolean {
  // Topic.startOrder/endOrder приходят от AI worker'а (см. AiTopicSchema) и
  // задают диапазон Utterance.order, относящийся к теме — так собираем
  // "Часть 1 / Часть 2" ровно как в эталонном протоколе.
  if (startOrder == null || endOrder == null) return true; // нет диапазона -> не фильтруем (одна тема на всю встречу)
  return order >= startOrder && order <= endOrder;
}
