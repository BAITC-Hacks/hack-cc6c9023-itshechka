import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from "@nestjs/websockets";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
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
  private readonly clientsByMeeting = new Map<string, any>();
  private readonly failedStreams = new Set<string>();
  private readonly bytesByMeeting = new Map<string, number>();

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly meetings: MeetingsService,
  ) {}

  async handleConnection(client: any, request: any) {
    const url = new URL(request?.url ?? "", "http://localhost");
    const meetingId = url.searchParams.get("meetingId");
    if (!meetingId) {
      client.close(1008, "meetingId query param is required");
      return;
    }
    client.pause();
    try {
      const meeting = await this.meetings.getOrThrow(meetingId);
      if (meeting.sourceType !== "LIVE" || meeting.status !== "RECORDING") {
        client.close(1008, "Meeting is not recording live audio");
        return;
      }
    } catch {
      client.close(1008, "Live meeting not found");
      return;
    }
    if (client.readyState !== 1) return;
    if (this.clientsByMeeting.has(meetingId)) {
      client.close(1008, "A stream is already active for this meeting");
      return;
    }
    (client as any).meetingId = meetingId;
    this.clientsByMeeting.set(meetingId, client);

    const dir = this.config.get("AUDIO_STORAGE_DIR", { infer: true });
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.resolve(dir, `${meetingId}-${randomUUID()}.webm`);
    const stream = fs.createWriteStream(filePath, { flags: "wx" });
    stream.on("error", (err) => {
      this.failedStreams.add(meetingId);
      this.logger.error(`Live write failed for ${meetingId}: ${err.message}`);
      client.close(1011, "Audio storage failed");
    });
    this.streams.set(meetingId, stream);
    this.filesByMeeting.set(meetingId, filePath);
    this.bytesByMeeting.set(meetingId, 0);
    this.logger.log(`Live stream started for meeting ${meetingId} -> ${filePath}`);

    client.on("message", (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        this.failedStreams.add(meetingId);
        client.close(1003, "Binary audio chunks required");
        return;
      }
      this.bytesByMeeting.set(meetingId, (this.bytesByMeeting.get(meetingId) ?? 0) + data.length);
      stream.write(data);
    });
    client.resume();
  }

  handleDisconnect(client: any) {
    const meetingId = (client as any).meetingId as string | undefined;
    if (!meetingId) return;
    if (this.clientsByMeeting.get(meetingId) !== client) return;
    this.clientsByMeeting.delete(meetingId);

    const stream = this.streams.get(meetingId);
    this.streams.delete(meetingId);

    const filePath = this.filesByMeeting.get(meetingId);
    this.filesByMeeting.delete(meetingId);
    const bytes = this.bytesByMeeting.get(meetingId) ?? 0;
    this.bytesByMeeting.delete(meetingId);
    if (!filePath || !stream) return;

    if (this.failedStreams.delete(meetingId) || bytes === 0) {
      stream.destroy();
      fs.promises.unlink(filePath).catch(() => undefined);
      return;
    }

    // UPLOADED must only become visible after all buffered chunks are written.
    stream.end(() => {
      this.meetings
        .stopLive(meetingId, filePath)
        .then(() => this.logger.log(`Live stream stopped for meeting ${meetingId}, saved to ${filePath}`))
        .catch((err) => this.logger.error(`Failed to finalize live meeting ${meetingId}`, err));
    });
  }
}
