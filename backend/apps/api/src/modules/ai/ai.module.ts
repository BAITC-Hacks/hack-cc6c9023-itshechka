import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { MeetingsModule } from "../meetings/meetings.module";
import { TranscriptModule } from "../transcript/transcript.module";

@Module({
  imports: [MeetingsModule, TranscriptModule],
  controllers: [AiController],
  providers: [AiOrchestratorService],
})
export class AiModule {}
