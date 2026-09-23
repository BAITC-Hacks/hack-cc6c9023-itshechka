import { Body, Controller, Get, Param, Patch, Post, Query, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  AttachAudioRequestSchema,
  CreateMeetingRequestSchema,
} from "@hackalem/contracts";
import { z } from "zod";
import { MeetingsService } from "./meetings.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

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

  /** Завершение live-записи: клиент/WS-gateway сохранил итоговый файл, репортит сюда финальный URL. */
  @Post(":id/stop")
  @UsePipes(new ZodValidationPipe(StopLiveSchema))
  stopLive(@Param("id") id: string, @Body() dto: any) {
    return this.meetings.stopLive(id, dto.audioUrl, dto.durationSec);
  }
}
