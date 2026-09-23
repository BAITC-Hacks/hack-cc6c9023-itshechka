import { z } from "zod";

export const meetingStatusSchema = z.enum(["processing", "ready", "error"]);
export const taskStatusSchema = z.enum(["new", "in_progress", "overdue", "done"]);
export const languageSchema = z.enum(["ru", "kk", "mixed"]);

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignee: z.string(),
  dueDate: z.string(),
  status: taskStatusSchema,
  priority: z.enum(["normal", "high"]),
  meetingId: z.string(),
});

export const transcriptSegmentSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  role: z.string().optional(),
  timestamp: z.string(),
  text: z.string(),
  language: languageSchema,
});

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  duration: z.string(),
  status: meetingStatusSchema,
  languages: z.array(languageSchema),
  participants: z.array(z.string()),
  summary: z.array(z.string()),
  tasks: z.array(taskSchema),
  transcript: z.array(transcriptSegmentSchema),
});

export const createMeetingSchema = z.object({
  title: z.string().min(3, "Укажите название совещания"),
  language: languageSchema,
  notifyParticipants: z.boolean(),
  fileName: z.string().min(1, "Добавьте аудио- или видеофайл"),
});

export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingTask = z.infer<typeof taskSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type Language = z.infer<typeof languageSchema>;

