import { z } from "zod";

export const meetingTaskStatusSchema = z.enum(["new", "in_progress", "overdue", "done"]);
export const meetingLanguageSchema = z.enum(["ru", "kk", "mixed"]);

export const createMeetingFormSchema = z.object({
  title: z.string().min(3, "Укажите название совещания"),
  language: meetingLanguageSchema,
  notifyParticipants: z.boolean(),
  fileName: z.string().min(1, "Добавьте аудио- или видеофайл"),
});

export type CreateMeetingForm = z.infer<typeof createMeetingFormSchema>;
export type MeetingLanguage = z.infer<typeof meetingLanguageSchema>;
export type MeetingTaskStatus = z.infer<typeof meetingTaskStatusSchema>;

export type MeetingTask = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: MeetingTaskStatus;
  priority: "normal" | "high";
  meetingId: string;
};

export type TranscriptSegment = {
  id: string;
  speaker: string;
  role?: string;
  timestamp: string;
  text: string;
  language: MeetingLanguage;
};

export type MeetingView = {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: "processing" | "ready" | "error";
  languages: MeetingLanguage[];
  participants: string[];
  summary: string[];
  tasks: MeetingTask[];
  transcript: TranscriptSegment[];
};

