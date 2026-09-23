import { BadGatewayException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AiProcessResult } from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { MeetingsService } from "../meetings/meetings.service";
import { TranscriptService } from "../transcript/transcript.service";
import { ConflictError, NotFoundError, ValidationError } from "../../common/api-error";
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

    if (!(await this.meetings.markProcessing(meetingId))) {
      throw new ConflictError("Meeting is already processing or ready");
    }

    const workerUrl = this.config.get("AI_WORKER_URL", { infer: true });
    const publicApiUrl = this.config.get("PUBLIC_API_URL", { infer: true });
    const callbackUrl = `${publicApiUrl}/internal/meetings/${meetingId}/result`;
    const workerAudioUrl = /^https?:\/\//.test(meeting.audioUrl)
      ? meeting.audioUrl
      : `${publicApiUrl}/meetings/${meetingId}/audio`;

    try {
      const res = await fetch(`${workerUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.get("AI_WORKER_TOKEN", { infer: true })
            ? { "X-AI-Worker-Token": this.config.get("AI_WORKER_TOKEN", { infer: true })! }
            : {}),
        },
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
      if (this.config.get("AI_DEMO_FALLBACK", { infer: true }) === "true") {
        this.logger.warn(`AI worker unavailable (${(err as Error).message}); using demo data`);
        const demoResult = buildDemoResult(meetingId);
        await this.handleResult(meetingId, demoResult);
        return { accepted: true, mode: "demo-fallback" as const };
      }
      this.logger.error(`AI worker rejected processing: ${(err as Error).message}`);
      await this.meetings.markFailed(meetingId);
      throw new BadGatewayException("AI worker недоступен или отклонил обработку");
    }
  }

  verifyWorkerToken(token: string | undefined) {
    const expected = this.config.get("AI_WORKER_TOKEN", { infer: true });
    if (!expected || token !== expected) throw new UnauthorizedException("Invalid AI worker token");
  }

  /** Webhook, который зовёт AI worker когда обработка закончена. */
  async handleResult(meetingId: string, result: AiProcessResult) {
    if (result.meetingId !== meetingId) {
      throw new ValidationError({ meetingId: "Result meetingId must match the URL" });
    }
    await this.transcript.saveProcessingResult(meetingId, result);
  }
}
