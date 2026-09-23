import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import WebSocket from "ws";
import { z } from "zod";
import {
  AUDIO_UPLOAD_FIELD,
  MeetingSchema, MeetingListResponseSchema, TranscriptResponseSchema,
  TopicSchema, SummarySchema, TaskSchema, TaskListResponseSchema,
  ExportSchema, ParticipantSchema, ApiErrorSchema,
} from "@hackalem/contracts";
import { buildDemoResult } from "../src/modules/ai/demo-adapter";

const base = process.env.SMOKE_API_URL ?? "http://localhost:4000/api/v1";
async function request(route: string, method = "GET", body?: unknown, status = method === "POST" ? 201 : 200) {
  const response = await fetch(`${base}${route}`, {
    method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
  console.log(`PASS ${method} ${route} (${status})`);
  return result;
}

async function main() {
  z.object({ status: z.literal("ok") }).parse(await request("/health"));
  const swagger = await (await fetch(`${new URL(base).origin}/api/docs-json`)).json() as any;
  assert.ok(swagger.paths["/api/v1/meetings/{id}/process"]);
  const uploadSpec = swagger.paths["/api/v1/meetings/{id}/upload"]?.post?.requestBody?.content?.["multipart/form-data"];
  assert.ok(uploadSpec?.schema?.properties?.[AUDIO_UPLOAD_FIELD], "Swagger must expose the MP3 file field");
  const list = MeetingListResponseSchema.parse(await request("/meetings?limit=100"));
  const seed = list.data.find(m => m.audioUrl === "seed://meeting-1.mp3");
  assert.ok(seed, "Run prisma:seed first");
  const id = seed.id;
  MeetingSchema.parse(await request(`/meetings/${id}`));
  const transcript = TranscriptResponseSchema.parse(await request(`/meetings/${id}/transcript`));
  assert.ok(transcript.utterances.length);
  const topics = TopicSchema.array().parse(await request(`/meetings/${id}/topics`));
  assert.equal(topics.length, 2);
  SummarySchema.array().parse(await request(`/meetings/${id}/summary`));
  for (const topic of topics) {
    SummarySchema.array().parse(await request(`/meetings/${id}/summary?topicId=${topic.id}`));
    const filtered = TaskListResponseSchema.parse(await request(`/meetings/${id}/tasks?topicId=${topic.id}`));
    assert.ok(filtered.data.every(t => t.topicId === topic.id));
  }
  const tasks = TaskListResponseSchema.parse(await request(`/meetings/${id}/tasks`));
  const task = tasks.data[0];
  assert.ok(task);
  try {
    const updated = TaskSchema.parse(await request(`/tasks/${task.id}`, "PATCH", {
      description: "Smoke: ручная правка поручения", status: "IN_PROGRESS",
      dueDate: "2026-10-01T00:00:00.000Z", dueRaw: "1 октября", responsibleRaw: "Smoke",
    }));
    assert.equal(updated.status, "IN_PROGRESS");
    assert.equal(updated.description, "Smoke: ручная правка поручения");
    assert.equal(updated.dueDate, "2026-10-01T00:00:00.000Z");
    const persisted = TaskListResponseSchema.parse(await request(`/meetings/${id}/tasks`));
    assert.deepEqual(persisted.data.find(t => t.id === task.id), updated);
  } finally {
    await request(`/tasks/${task.id}`, "PATCH", task);
  }
  ApiErrorSchema.parse(await request(`/tasks/${task.id}`, "PATCH", { status: "INVALID" }, 400));
  ApiErrorSchema.parse(await request("/meetings/missing-smoke-id", "GET", undefined, 404));
  const exported = ExportSchema.parse(await request(`/meetings/${id}/export`, "POST", { format: "DOCX" }));
  const download = await fetch(`${base}/exports/${exported.id}/download`);
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition") ?? "", /\.docx/);
  const bytes = Buffer.from(await download.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  await fs.mkdir("storage/smoke", { recursive: true });
  await fs.writeFile("storage/smoke/seed-protocol.docx", bytes);
  console.log("PASS DOCX download -> storage/smoke/seed-protocol.docx");
  const pdfExport = ExportSchema.parse(await request(`/meetings/${id}/export`, "POST", { format: "PDF" }));
  assert.equal(pdfExport.format, "PDF");
  const pdfDownload = await fetch(`${base}/exports/${pdfExport.id}/download`);
  assert.equal(pdfDownload.status, 200);
  const pdfBytes = Buffer.from(await pdfDownload.arrayBuffer());
  assert.equal(pdfBytes.subarray(0, 5).toString(), "%PDF-");
  assert.match(pdfDownload.headers.get("content-disposition") ?? "", /\.pdf/);
  await fs.writeFile("storage/smoke/seed-protocol.pdf", pdfBytes);
  console.log("PASS PDF download -> storage/smoke/seed-protocol.pdf");

  const file = MeetingSchema.parse(await request("/meetings", "POST", { title: "Smoke demo fallback", sourceType: "FILE" }));
  await request(`/meetings/${file.id}/audio`, "POST", { audioUrl: "smoke://fixture.webm" });
  const processed = await request(`/meetings/${file.id}/process`, "POST", {});
  assert.deepEqual(processed, { accepted: true, mode: "demo-fallback" }, "Smoke requires AI worker to be unavailable");
  const ready = MeetingSchema.parse(await request(`/meetings/${file.id}`));
  assert.equal(ready.status, "READY");
  const expected = buildDemoResult(file.id);
  assert.equal(ready.durationSec, expected.durationSec);
  const result = TranscriptResponseSchema.parse(await request(`/meetings/${file.id}/transcript`));
  assert.equal(result.utterances.length, expected.utterances.length);
  const resultTasks = TaskListResponseSchema.parse(await request(`/meetings/${file.id}/tasks`));
  assert.equal(resultTasks.data.length, expected.tasks.length);
  ApiErrorSchema.parse(await request(`/meetings/${file.id}/process`, "POST", {}, 409));
  assert.equal(TaskListResponseSchema.parse(await request(`/meetings/${file.id}/tasks`)).data.length, resultTasks.data.length);
  const resultTopics = TopicSchema.array().parse(await request(`/meetings/${file.id}/topics`));
  assert.deepEqual(resultTopics.map(t => t.title), expected.topics.map(t => t.title));
  const overall = SummarySchema.array().parse(await request(`/meetings/${file.id}/summary`));
  assert.deepEqual(overall.map(s => s.text), expected.summaries.filter(s => s.topicOrder === null).map(s => s.text));
  for (const topic of resultTopics) {
    const summaries = SummarySchema.array().parse(await request(`/meetings/${file.id}/summary?topicId=${topic.id}`));
    assert.deepEqual(summaries.map(s => s.text), expected.summaries.filter(s => s.topicOrder === topic.order).map(s => s.text));
  }
  assert.ok(resultTasks.data.every(t => !t.responsibleId || result.participants.some(p => p.id === t.responsibleId)));
  assert.ok(resultTasks.data.every(t => !t.topicId || resultTopics.some(topic => topic.id === t.topicId)));
  assert.ok(resultTasks.data.every(t => !t.sourceUtteranceId || result.utterances.some(u => u.id === t.sourceUtteranceId)));
  const participant = result.participants[0];
  const renamed = ParticipantSchema.parse(await request(`/participants/${participant.id}`, "PATCH", { fullName: "Smoke Participant" }));
  assert.equal(renamed.fullName, "Smoke Participant");

  const webhook = MeetingSchema.parse(await request("/meetings", "POST", { title: "Smoke worker callback", sourceType: "FILE" }));
  const callback = await fetch(`${base}/internal/meetings/${webhook.id}/result`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDemoResult(webhook.id)), signal: AbortSignal.timeout(15000),
  });
  assert.equal(callback.status, 201, await callback.text());
  assert.equal(MeetingSchema.parse(await request(`/meetings/${webhook.id}`)).status, "READY");
  const callbackTranscript = TranscriptResponseSchema.parse(await request(`/meetings/${webhook.id}/transcript`));
  assert.deepEqual(callbackTranscript.utterances.map(u => u.text), result.utterances.map(u => u.text));
  const repeated = await fetch(`${base}/internal/meetings/${webhook.id}/result`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDemoResult(webhook.id)), signal: AbortSignal.timeout(15000),
  });
  assert.equal(repeated.status, 201, await repeated.text());
  const unchanged = TranscriptResponseSchema.parse(await request(`/meetings/${webhook.id}/transcript`));
  assert.equal(unchanged.utterances.length, callbackTranscript.utterances.length);

  const sourceMp3 = path.resolve("../../ml/data/private/meeting_01.mp3");
  if (await fs.stat(sourceMp3).then(() => true, () => false)) {
    const uploadMeeting = MeetingSchema.parse(await request("/meetings", "POST", { title: "Smoke real MP3 upload", sourceType: "FILE" }));
    const original = await fs.readFile(sourceMp3);
    const form = new FormData();
    form.append(AUDIO_UPLOAD_FIELD, new Blob([original], { type: "audio/mpeg" }), "meeting_01.mp3");
    const uploadedResponse = await fetch(`${base}/meetings/${uploadMeeting.id}/upload`, {
      method: "POST", body: form, signal: AbortSignal.timeout(15000),
    });
    assert.equal(uploadedResponse.status, 201, await uploadedResponse.clone().text());
    const uploaded = MeetingSchema.parse(await uploadedResponse.json());
    assert.equal(uploaded.status, "UPLOADED");
    assert.ok(uploaded.audioUrl);
    assert.deepEqual(await fs.readFile(uploaded.audioUrl), original);
    console.log("PASS real MP3 upload matches source bytes");
  }

  const live = MeetingSchema.parse(await request("/meetings", "POST", { title: "Smoke live binary", sourceType: "LIVE" }));
  assert.equal(live.status, "RECORDING");
  const chunks = [Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 255]), Buffer.alloc(128 * 1024, 0xa5)];
  const wsUrl = new URL(`${base}/meetings/stream`);
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.searchParams.set("meetingId", live.id);
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timeout = setTimeout(() => { socket.terminate(); reject(new Error("WS timeout")); }, 10000);
    socket.on("error", reject);
    socket.on("open", () => { for (const chunk of chunks) socket.send(chunk); socket.close(); });
    socket.on("close", () => { clearTimeout(timeout); resolve(); });
  });
  let finalized;
  for (let i = 0; i < 50; i++) {
    finalized = MeetingSchema.parse(await request(`/meetings/${live.id}`));
    if (finalized.status === "UPLOADED") break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(finalized?.status, "UPLOADED");
  assert.ok(finalized.audioUrl);
  assert.deepEqual(await fs.readFile(path.resolve(finalized.audioUrl)), Buffer.concat(chunks));
  await request(`/meetings/${live.id}/stop`, "POST", { audioUrl: finalized.audioUrl, durationSec: 1 });
  console.log("PASS live binary bytes, disconnect finalization and stop endpoint");
  console.log(JSON.stringify({ seed: id, fallback: file.id, webhook: webhook.id, live: live.id }));
  console.log("All smoke checks passed. Synthetic meetings retained for inspection.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
