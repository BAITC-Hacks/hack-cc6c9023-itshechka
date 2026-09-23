import { Injectable } from "@nestjs/common";
import type {
  AttachAudioRequest,
  CreateMeetingRequest,
} from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundError } from "../../common/api-error";
import { serializeMeeting } from "../../common/serialize";

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeetingRequest) {
    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        organization: dto.organization,
        sourceType: dto.sourceType,
        status: dto.sourceType === "LIVE" ? "RECORDING" : "UPLOADED",
      },
    });
    return serializeMeeting(meeting);
  }

  async list(page: number, limit: number, status?: string) {
    const where = status ? { status: status as any } : {};
    const [rows, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.meeting.count({ where }),
    ]);
    return {
      data: rows.map(serializeMeeting),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getOrThrow(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundError("Meeting", id);
    return meeting;
  }

  async getById(id: string) {
    return serializeMeeting(await this.getOrThrow(id));
  }

  async attachAudio(id: string, dto: AttachAudioRequest) {
    await this.getOrThrow(id);
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        audioUrl: dto.audioUrl,
        durationSec: dto.durationSec,
        status: "UPLOADED",
      },
    });
    return serializeMeeting(meeting);
  }

  /** Live-поток: клиент завершил запись — переводим встречу в PROCESSING как только есть финальный audioUrl. */
  async stopLive(id: string, audioUrl: string, durationSec?: number) {
    const meeting = await this.getOrThrow(id);
    if (meeting.sourceType !== "LIVE") {
      throw new NotFoundError("Live meeting", id);
    }
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { audioUrl, durationSec, status: "UPLOADED" },
    });
    return serializeMeeting(updated);
  }

  async markProcessing(id: string) {
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: { status: "PROCESSING" },
    });
    return serializeMeeting(meeting);
  }

  async markReady(id: string, durationSec?: number) {
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: { status: "READY", ...(durationSec ? { durationSec } : {}) },
    });
    return serializeMeeting(meeting);
  }

  async markFailed(id: string) {
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return serializeMeeting(meeting);
  }
}
