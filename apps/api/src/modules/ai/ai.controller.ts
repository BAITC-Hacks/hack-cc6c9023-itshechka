import { Body, Controller, Headers, Param, Post, UsePipes } from "@nestjs/common";
import { z } from "zod";
import { ApiTags } from "@nestjs/swagger";
import { AiProcessResultSchema, ProcessMeetingRequestSchema } from "@hackalem/contracts";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Public } from "../../common/auth/public.decorator";

@ApiTags("ai")
@Controller()
export class AiController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Post("meetings/:id/process")
  @UsePipes(new ZodValidationPipe(ProcessMeetingRequestSchema))
  process(@Param("id") id: string, @Body() dto: any) {
    return this.orchestrator.triggerProcessing(id, dto.langHint);
  }

  /** Webhook, который вызывает AI worker по завершении обработки. Не выставляется фронту. */
  @Public()
  @Post("internal/meetings/:id/result")
  @UsePipes(new ZodValidationPipe(AiProcessResultSchema))
  receiveResult(@Param("id") id: string, @Body() dto: any, @Headers("x-ai-worker-token") token?: string) {
    this.orchestrator.verifyWorkerToken(token);
    return this.orchestrator.handleResult(id, dto);
  }

  @Public()
  @Post("internal/meetings/:id/failed")
  @UsePipes(new ZodValidationPipe(z.object({ message: z.string().min(1) })))
  receiveFailure(@Param("id") id: string, @Body() dto: { message: string }, @Headers("x-ai-worker-token") token?: string) {
    this.orchestrator.verifyWorkerToken(token);
    return this.orchestrator.handleFailure(id, dto.message);
  }
}
