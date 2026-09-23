import type { CreateMeetingInput, Meeting } from "@repo/contracts";
import { apiFetch } from "@/lib/api";
import { demoMeeting, meetings } from "./mock-data";

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getMeetings(): Promise<Meeting[]> {
  if (!useMocks) return apiFetch<Meeting[]>("/meetings");
  await pause(420);
  return meetings;
}

export async function getMeeting(id: string): Promise<Meeting> {
  if (!useMocks) return apiFetch<Meeting>(`/meetings/${id}`);
  await pause(300);
  return meetings.find((meeting) => meeting.id === id) ?? demoMeeting;
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  if (!useMocks) return apiFetch<Meeting>("/meetings", { method: "POST", body: JSON.stringify(input) });
  await pause(2600);
  return { ...demoMeeting, title: input.title };
}

