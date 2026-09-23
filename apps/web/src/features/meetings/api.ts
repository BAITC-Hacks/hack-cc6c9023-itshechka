import type {
  CreateExportRequest,
  CreateMeetingRequest,
  Export as ApiExport,
  Meeting as ApiMeeting,
  MeetingListResponse,
  Participant,
  Summary,
  Task as ApiTask,
  TaskListResponse,
  TranscriptResponse,
  UpdateParticipantRequest,
  UpdateTaskRequest,
} from "@hackalem/contracts";
import { apiFetch, apiUrl } from "@/lib/api";
import { allTasks, demoMeeting, meetings } from "./mock-data";
import type { CreateMeetingForm, MeetingTask, MeetingView, TranscriptSegment } from "./types";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type CreateMeetingInput = {
  values: CreateMeetingForm;
  file: File;
  durationSec?: number;
};

function formatDuration(durationSec: number | null) {
  if (!durationSec) return "00:00";
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor(durationSec % 3600 / 60);
  const seconds = durationSec % 60;
  const shortTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${shortTime}` : shortTime;
}

function formatTimestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const shortTime = `${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${shortTime}` : shortTime;
}

function mapMeetingStatus(status: ApiMeeting["status"]): MeetingView["status"] {
  if (status === "FAILED") return "error";
  if (status === "READY") return "ready";
  return "processing";
}

function meetingShell(meeting: ApiMeeting): MeetingView {
  return {
    id: meeting.id,
    title: meeting.title,
    date: meeting.createdAt,
    duration: formatDuration(meeting.durationSec),
    status: mapMeetingStatus(meeting.status),
    audioUrl: meeting.audioUrl && !meeting.audioUrl.includes("://") ? apiUrl(`/meetings/${meeting.id}/audio`) : undefined,
    participantCount: meeting.participantCount,
    taskCount: meeting.taskCount,
    languages: ["mixed"],
    participants: [],
    summary: [],
    tasks: [],
    transcript: [],
  };
}

function mapTask(task: ApiTask): MeetingTask {
  return {
    id: task.id,
    title: task.description,
    assignee: task.responsibleRaw ?? "Не назначен",
    dueDate: task.dueDate ?? "",
    status: task.status === "DONE" ? "done" : task.status === "OVERDUE" ? "overdue" : task.status === "IN_PROGRESS" ? "in_progress" : "new",
    priority: task.priority === "HIGH" ? "high" : "normal",
    meetingId: task.meetingId,
  };
}

export async function getMeetings(): Promise<MeetingView[]> {
  if (USE_MOCKS) {
    await pause(420);
    return meetings;
  }
  const response = await apiFetch<MeetingListResponse>("/meetings?limit=100");
  return response.data.map(meetingShell);
}

export async function getTasks(): Promise<MeetingTask[]> {
  if (USE_MOCKS) return allTasks;
  const response = await apiFetch<TaskListResponse>("/tasks");
  return response.data.map(mapTask);
}

export async function getMeeting(id: string): Promise<MeetingView> {
  if (USE_MOCKS) {
    await pause(300);
    return meetings.find((meeting) => meeting.id === id) ?? demoMeeting;
  }

  const [meeting, taskResponse, transcriptResponse, summaries] = await Promise.all([
    apiFetch<ApiMeeting>(`/meetings/${id}`),
    apiFetch<TaskListResponse>(`/meetings/${id}/tasks`),
    apiFetch<TranscriptResponse>(`/meetings/${id}/transcript`),
    apiFetch<Summary[]>(`/meetings/${id}/summary`),
  ]);
  const participantsById = new Map(transcriptResponse.participants.map((participant) => [participant.id, participant]));
  const tasks = taskResponse.data.map((task) => {
    const mapped = mapTask(task);
    const participant = task.responsibleId ? participantsById.get(task.responsibleId) : undefined;
    return { ...mapped, assignee: participant?.fullName ?? participant?.speakerTag ?? mapped.assignee };
  });
  const transcript: TranscriptSegment[] = transcriptResponse.utterances.map((utterance) => {
    const participant = utterance.participantId ? participantsById.get(utterance.participantId) : undefined;
    return {
      id: utterance.id,
      participantId: utterance.participantId ?? undefined,
      speaker: participant?.fullName ?? participant?.speakerTag ?? "Неизвестный спикер",
      role: participant?.role ?? undefined,
      timestamp: formatTimestamp(utterance.startMs),
      text: utterance.text,
      language: "mixed",
    };
  });

  return {
    ...meetingShell(meeting),
    participants: transcriptResponse.participants.map((participant) => participant.fullName ?? participant.speakerTag),
    participantIds: Object.fromEntries(transcriptResponse.participants.map((participant) => [participant.fullName ?? participant.speakerTag, participant.id])),
    summary: summaries.map((summary) => summary.text),
    tasks,
    transcript,
  };
}

export async function createMeeting({ values, file, durationSec }: CreateMeetingInput): Promise<MeetingView> {
  if (USE_MOCKS) {
    await pause(2600);
    if (values.demoOutcome === "error") throw new Error("Демонстрационная ошибка обработки");
    const id = `meeting-${Date.now()}`;
    return {
      ...demoMeeting,
      id,
      title: values.title,
      date: new Date().toISOString(),
      tasks: demoMeeting.tasks.map((task) => ({ ...task, id: `${id}-${task.id}`, meetingId: id })),
      transcript: demoMeeting.transcript.map((segment) => ({ ...segment, id: `${id}-${segment.id}` })),
    };
  }

  const payload: CreateMeetingRequest = { title: values.title, sourceType: "FILE" };
  const meeting = await apiFetch<ApiMeeting>("/meetings", { method: "POST", body: JSON.stringify(payload) });
  const upload = new FormData();
  upload.append("file", file);
  if (durationSec) upload.append("durationSec", String(durationSec));
  await apiFetch<ApiMeeting>(`/meetings/${meeting.id}/audio-file`, { method: "POST", body: upload });
  await apiFetch<{ accepted: true; mode: "worker" | "demo-fallback" }>(`/meetings/${meeting.id}/process`, {
    method: "POST",
    body: JSON.stringify({ langHint: values.language === "kk" ? "kz" : values.language }),
  });
  return getMeeting(meeting.id);
}

export async function updateTask(input: MeetingTask): Promise<MeetingTask> {
  const payload: UpdateTaskRequest = {
    description: input.title,
    responsibleId: null,
    responsibleRaw: input.assignee,
    dueDate: input.dueDate ? new Date(`${input.dueDate.slice(0, 10)}T00:00:00.000Z`).toISOString() : null,
    dueRaw: input.dueDate || null,
    status: input.status === "done" ? "DONE" : input.status === "overdue" ? "OVERDUE" : input.status === "in_progress" ? "IN_PROGRESS" : "OPEN",
    priority: input.priority === "high" ? "HIGH" : "NORMAL",
  };
  return mapTask(await apiFetch<ApiTask>(`/tasks/${input.id}`, { method: "PATCH", body: JSON.stringify(payload) }));
}

export async function updateParticipant(input: { id: string; name: string }): Promise<Participant> {
  const payload: UpdateParticipantRequest = { fullName: input.name };
  return apiFetch<Participant>(`/participants/${input.id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function createExport(input: { meetingId: string; format: CreateExportRequest["format"] }): Promise<ApiExport> {
  return apiFetch<ApiExport>(`/meetings/${input.meetingId}/export`, {
    method: "POST",
    body: JSON.stringify({ format: input.format } satisfies CreateExportRequest),
  });
}
