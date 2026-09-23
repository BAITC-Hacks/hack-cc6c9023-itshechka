import { Body, Controller, Param, Post, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AiProcessResultSchema, ProcessMeetingRequestSchema } from "@hackalem/contracts";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

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
  @Post("internal/meetings/:id/result")
  @UsePipes(new ZodValidationPipe(AiProcessResultSchema))
  receiveResult(@Param("id") id: string, @Body() dto: any) {
    return this.orchestrator.handleResult(id, dto);
  }
}
