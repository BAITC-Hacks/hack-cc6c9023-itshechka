import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { diskStorage } from "multer";
import {
  AUDIO_UPLOAD_FIELD,
  AUDIO_UPLOAD_MAX_BYTES,
  AttachAudioRequestSchema,
  CreateMeetingRequestSchema,
} from "@hackalem/contracts";
import { z } from "zod";
import { MeetingsService } from "./meetings.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { WorkerAccess } from "../../common/auth/public.decorator";

const StopLiveSchema = z.object({
  audioUrl: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
});

@ApiTags("meetings")
@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateMeetingRequestSchema))
  create(@Body() dto: any) {
    return this.meetings.create(dto);
  }

  @Get()
  list(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("status") status?: string,
  ) {
    return this.meetings.list(Number(page), Number(limit), status);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.meetings.getById(id);
  }

  @Post(":id/audio")
  @UsePipes(new ZodValidationPipe(AttachAudioRequestSchema))
  attachAudio(@Param("id") id: string, @Body() dto: any) {
    return this.meetings.attachAudio(id, dto);
  }

  @Post(":id/audio-file")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const dir = process.env.AUDIO_STORAGE_DIR ?? "./storage/audio";
        fs.mkdirSync(dir, { recursive: true });
        callback(null, dir);
      },
      filename: (request, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase() || ".webm";
        callback(null, `${request.params.id}-${Date.now()}${extension}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const allowed = new Set([".mp3", ".wav", ".m4a", ".mp4", ".webm"]);
      if (!allowed.has(path.extname(file.originalname).toLowerCase())) {
        callback(new BadRequestException("Unsupported audio/video format"), false);
        return;
      }
      callback(null, true);
    },
  }))
  async uploadAudio(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("durationSec") rawDuration?: string,
  ) {
    if (!file) throw new BadRequestException("Audio file is required");
    const parsedDuration = rawDuration === undefined ? undefined : Number(rawDuration);
    if (parsedDuration !== undefined && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      fs.unlinkSync(file.path);
      throw new BadRequestException("durationSec must be a positive number");
    }
    const durationSec = parsedDuration === undefined ? undefined : Math.round(parsedDuration);
    try {
      return await this.meetings.attachAudio(id, { audioUrl: file.path, durationSec });
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw error;
    }
  }

  @Get(":id/audio")
  @WorkerAccess()
  async downloadAudio(@Param("id") id: string, @Res() response: Response) {
    const audioPath = await this.meetings.getAudioPath(id);
    response.setHeader("Content-Disposition", `inline; filename="${path.basename(audioPath)}"`);
    response.sendFile(path.resolve(audioPath));
  }

  /** Завершение live-записи: клиент/WS-gateway сохранил итоговый файл, репортит сюда финальный URL. */
  @Post(":id/stop")
  @UsePipes(new ZodValidationPipe(StopLiveSchema))
  stopLive(@Param("id") id: string, @Body() dto: any) {
    return this.meetings.stopLive(id, dto.audioUrl, dto.durationSec);
  }
}
