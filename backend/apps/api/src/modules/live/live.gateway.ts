import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from "@nestjs/websockets";
import * as fs from "fs";
import * as path from "path";
import type { Env } from "../../config/env.schema";
import { MeetingsService } from "../meetings/meetings.service";

/**
 * Приём аудио-чанков во время live-встречи: ws://.../api/v1/meetings/stream?meetingId=xxx
 * Backend только надёжно копит аудио на диск во время записи; полный pipeline
 * (диаризация/поручения/темы) запускается по /meetings/:id/process после stop,
 * так же как для загруженного файла — см. раздел 1 бэкенд-ТЗ.
 *
 * Партиальный live-транскрипт (форвардинг чанков в AI worker на лету для
 * чернового текста в реальном времени) — TODO, зона AI worker'а.
 */
@WebSocketGateway({ path: "/api/v1/meetings/stream" })
@Injectable()
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveGateway.name);
  private readonly streams = new Map<string, fs.WriteStream>();
  private readonly filesByMeeting = new Map<string, string>();

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly meetings: MeetingsService,
  ) {}

  handleConnection(client: any, request: any) {
    const url = new URL(request?.url ?? "", "http://localhost");
    const meetingId = url.searchParams.get("meetingId");
    if (!meetingId) {
      client.close(1008, "meetingId query param is required");
      return;
    }
    (client as any).meetingId = meetingId;

    const dir = this.config.get("AUDIO_STORAGE_DIR", { infer: true });
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${meetingId}.webm`);
    const stream = fs.createWriteStream(filePath, { flags: "a" });
    this.streams.set(meetingId, stream);
    this.filesByMeeting.set(meetingId, filePath);
    this.logger.log(`Live stream started for meeting ${meetingId} -> ${filePath}`);

    client.on("message", (data: Buffer) => {
      stream.write(data);
    });
  }

  handleDisconnect(client: any) {
    const meetingId = (client as any).meetingId as string | undefined;
    if (!meetingId) return;

    const stream = this.streams.get(meetingId);
    stream?.end();
    this.streams.delete(meetingId);

    const filePath = this.filesByMeeting.get(meetingId);
    this.filesByMeeting.delete(meetingId);
    if (!filePath) return;

    this.meetings
      .stopLive(meetingId, filePath)
      .then(() => this.logger.log(`Live stream stopped for meeting ${meetingId}, saved to ${filePath}`))
      .catch((err) => this.logger.error(`Failed to finalize live meeting ${meetingId}`, err));
  }
}
