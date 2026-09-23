import { z } from "zod";

export const TaskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE", "OVERDUE"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  topicId: z.string().nullable(),
  description: z.string(),
  responsibleId: z.string().nullable(),
  responsibleRaw: z.string().nullable(),
  dueDate: z.string().nullable(), // ISO 8601 UTC
  dueRaw: z.string().nullable(),
  status: TaskStatusSchema,
  sourceUtteranceId: z.string().nullable(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskListResponseSchema = z.object({
  data: z.array(TaskSchema),
});
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;

export const UpdateTaskRequestSchema = z.object({
  description: z.string().min(1).optional(),
  responsibleId: z.string().nullable().optional(),
  responsibleRaw: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  dueRaw: z.string().nullable().optional(),
  status: TaskStatusSchema.optional(),
  topicId: z.string().nullable().optional(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
