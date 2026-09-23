import type {
  CreateMeetingRequest,
  Meeting as ApiMeeting,
  MeetingListResponse,
  Summary,
  TaskListResponse,
  TranscriptResponse,
} from "@hackalem/contracts";
import { apiFetch } from "@/lib/api";
import { demoMeeting, meetings } from "./mock-data";
import type { CreateMeetingForm, MeetingTask, MeetingView, TranscriptSegment } from "./types";

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatDuration(durationSec: number | null) {
  if (!durationSec) return "00:00";
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
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
    languages: ["mixed"],
    participants: [],
    summary: [],
    tasks: [],
    transcript: [],
  };
}

export async function getMeetings(): Promise<MeetingView[]> {
  if (useMocks) {
    await pause(420);
    return meetings;
  }

  const response = await apiFetch<MeetingListResponse>("/meetings");
  return response.data.map(meetingShell);
}

export async function getMeeting(id: string): Promise<MeetingView> {
  if (useMocks) {
    await pause(300);
    return meetings.find((meeting) => meeting.id === id) ?? demoMeeting;
  }

  const [meeting, taskResponse, transcriptResponse, summaries] = await Promise.all([
    apiFetch<ApiMeeting>(`/meetings/${id}`),
    apiFetch<TaskListResponse>(`/meetings/${id}/tasks`),
    apiFetch<TranscriptResponse>(`/meetings/${id}/transcript`),
    apiFetch<Summary[]>(`/meetings/${id}/summary`),
  ]);

  const participantsById = new Map(
    transcriptResponse.participants.map((participant) => [participant.id, participant]),
  );

  const tasks: MeetingTask[] = taskResponse.data.map((task) => ({
    id: task.id,
    title: task.description,
    assignee: task.responsibleRaw ?? "Не назначен",
    dueDate: task.dueDate ?? new Date().toISOString(),
    status: task.status === "DONE" ? "done" : task.status === "OVERDUE" ? "overdue" : task.status === "IN_PROGRESS" ? "in_progress" : "new",
    priority: task.status === "OVERDUE" ? "high" : "normal",
    meetingId: task.meetingId,
  }));

  const transcript: TranscriptSegment[] = transcriptResponse.utterances.map((utterance) => {
    const participant = utterance.participantId ? participantsById.get(utterance.participantId) : undefined;
    return {
      id: utterance.id,
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
    summary: summaries.map((summary) => summary.text),
    tasks,
    transcript,
  };
}

export async function createMeeting(input: CreateMeetingForm): Promise<MeetingView> {
  if (useMocks) {
    await pause(2600);
    return { ...demoMeeting, title: input.title };
  }

  const payload: CreateMeetingRequest = {
    title: input.title,
    sourceType: "FILE",
  };
  const meeting = await apiFetch<ApiMeeting>("/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return meetingShell(meeting);
}
