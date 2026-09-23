import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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
  updateParticipant(
    @Param("id") id: string,
    @Body() dto: { fullName?: string; role?: string },
  ) {
    return this.transcript.updateParticipant(id, dto);
  }
}
