import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AiProcessResult } from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { MeetingsService } from "../meetings/meetings.service";
import { TranscriptService } from "../transcript/transcript.service";
import { NotFoundError } from "../../common/api-error";
import { buildDemoResult } from "./demo-adapter";
import type { Env } from "../../config/env.schema";

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly meetings: MeetingsService,
    private readonly transcript: TranscriptService,
  ) {}

  /** POST /meetings/:id/process — запускает полный pipeline на уже загруженном аудио. */
  async triggerProcessing(meetingId: string, langHint: "ru" | "kz" | "mixed") {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundError("Meeting", meetingId);
    if (!meeting.audioUrl) {
      throw new NotFoundError("Meeting audio", meetingId); // TODO: dedicated 409 error type
    }

    await this.meetings.markProcessing(meetingId);

    const workerUrl = this.config.get("AI_WORKER_URL", { infer: true });
    const publicApiUrl = this.config.get("PUBLIC_API_URL", { infer: true });
    const callbackUrl = `${publicApiUrl}/internal/meetings/${meetingId}/result`;
    const workerAudioUrl = /^https?:\/\//.test(meeting.audioUrl)
      ? meeting.audioUrl
      : `${publicApiUrl}/meetings/${meetingId}/audio`;

    try {
      const res = await fetch(`${workerUrl}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          audioUrl: workerAudioUrl,
          langHint,
          callbackUrl,
        }),
        signal: AbortSignal.timeout(3000), // worker обычно отвечает async через webhook — только проверяем, что он живой
      });
      if (!res.ok) throw new Error(`AI worker responded ${res.status}`);
      return { accepted: true, mode: "worker" as const };
    } catch (err) {
      // AI worker недоступен (например, во время разработки backend'а отдельно) —
      // не блокируем демонстрацию pipeline: используем demo-adapter с фикстурой
      // в ТОЙ ЖЕ схеме AiProcessResult, что и настоящий воркер.
      this.logger.warn(
        `AI worker unreachable (${(err as Error).message}), falling back to demo adapter`,
      );
      const demoResult = buildDemoResult(meetingId);
      await this.handleResult(meetingId, demoResult);
      return { accepted: true, mode: "demo-fallback" as const };
    }
  }

  /** Webhook, который зовёт AI worker когда обработка закончена. */
  async handleResult(meetingId: string, result: AiProcessResult) {
    await this.transcript.saveProcessingResult(meetingId, result);
    await this.meetings.markReady(meetingId, result.durationSec);
  }
}
