import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import type {
  AttachAudioRequest,
  CreateMeetingRequest,
} from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { ConflictError, NotFoundError, ValidationError } from "../../common/api-error";
import { serializeMeeting } from "../../common/serialize";
import type { Env } from "../../config/env.schema";

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService<Env, true>) {}

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
        include: { _count: { select: { participants: true, tasks: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.meeting.count({ where }),
    ]);
    return {
      data: rows.map((meeting) => ({
        ...serializeMeeting(meeting),
        participantCount: meeting._count.participants,
        taskCount: meeting._count.tasks,
      })),
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

  async uploadAudio(id: string, file?: { buffer: Buffer; originalname: string; size: number }) {
    const meeting = await this.getOrThrow(id);
    if (meeting.sourceType !== "FILE" || meeting.status !== "UPLOADED") {
      throw new ConflictError("Audio upload requires an unprocessed FILE meeting");
    }
    if (!file?.buffer?.length || !file.originalname.toLowerCase().endsWith(".mp3")) {
      throw new ValidationError({ file: "A non-empty MP3 file is required" });
    }
    const bytes = file.buffer;
    const isMp3 = bytes.subarray(0, 3).toString("ascii") === "ID3" ||
      (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    if (!isMp3) throw new ValidationError({ file: "Invalid MP3 header" });

    const dir = path.resolve(this.config.get("AUDIO_STORAGE_DIR", { infer: true }));
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${id}-${randomUUID()}.mp3`);
    await fs.writeFile(filePath, bytes, { flag: "wx" });
    try {
      return await this.attachAudio(id, { audioUrl: filePath });
    } catch (error) {
      await fs.unlink(filePath);
      throw error;
    }
  }

  async getAudioPath(id: string) {
    const meeting = await this.getOrThrow(id);
    const storageRoot = path.resolve(this.config.get("AUDIO_STORAGE_DIR", { infer: true }));
    const audioPath = meeting.audioUrl ? path.resolve(meeting.audioUrl) : null;
    const relative = audioPath ? path.relative(storageRoot, audioPath) : null;
    if (!audioPath || !relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new NotFoundError("Meeting audio", id);
    }
    try {
      if (!(await fs.stat(audioPath)).isFile()) throw new Error("Not a file");
    } catch {
      throw new NotFoundError("Meeting audio", id);
    }
    return audioPath;
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
    const updated = await this.prisma.meeting.updateMany({
      where: { id, status: { in: ["UPLOADED", "FAILED"] } },
      data: { status: "PROCESSING" },
    });
    return updated.count === 1;
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
