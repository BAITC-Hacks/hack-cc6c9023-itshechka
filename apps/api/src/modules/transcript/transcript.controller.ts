import { Body, Controller, Get, Param, Patch, Query, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UpdateParticipantRequestSchema, type UpdateParticipantRequest } from "@hackalem/contracts";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TranscriptService } from "./transcript.service";

@ApiTags("transcript")
@Controller()
export class TranscriptController {
  constructor(private readonly transcript: TranscriptService) {}

  @Get("meetings/:id/transcript")
  getTranscript(@Param("id") id: string) {
    return this.transcript.getTranscript(id);
  }

  @Get("meetings/:id/topics")
  getTopics(@Param("id") id: string) {
    return this.transcript.getTopics(id);
  }

  @Get("meetings/:id/summary")
  getSummary(@Param("id") id: string, @Query("topicId") topicId?: string) {
    return this.transcript.getSummary(id, topicId);
  }

  @Patch("participants/:id")
  @UsePipes(new ZodValidationPipe(UpdateParticipantRequestSchema))
  updateParticipant(
    @Param("id") id: string,
    @Body() dto: UpdateParticipantRequest,
  ) {
    return this.transcript.updateParticipant(id, dto);
  }
}
