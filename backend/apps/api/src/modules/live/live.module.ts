import { Module } from "@nestjs/common";
import { LiveGateway } from "./live.gateway";
import { MeetingsModule } from "../meetings/meetings.module";

@Module({
  imports: [MeetingsModule],
  providers: [LiveGateway],
})
export class LiveModule {}
