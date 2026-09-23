import { z } from "zod";

export const SourceTypeSchema = z.enum(["FILE", "LIVE"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const MeetingStatusSchema = z.enum([
  "UPLOADED",
  "RECORDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;

export const CreateMeetingRequestSchema = z.object({
  title: z.string().min(1).max(300),
  organization: z.string().max(300).optional(),
  sourceType: SourceTypeSchema,
});
export type CreateMeetingRequest = z.infer<typeof CreateMeetingRequestSchema>;

export const MeetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string().nullable(),
  sourceType: SourceTypeSchema,
  status: MeetingStatusSchema,
  audioUrl: z.string().nullable(),
  durationSec: z.number().int().nullable(),
  createdAt: z.string(), // ISO 8601 UTC
});
export type Meeting = z.infer<typeof MeetingSchema>;

export const MeetingListResponseSchema = z.object({
  data: z.array(MeetingSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type MeetingListResponse = z.infer<typeof MeetingListResponseSchema>;

export const AttachAudioRequestSchema = z.object({
  audioUrl: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
});
export type AttachAudioRequest = z.infer<typeof AttachAudioRequestSchema>;

// Multipart POST /meetings/:id/upload: field name and size limit shared with web.
export const AUDIO_UPLOAD_FIELD = "file";
export const AUDIO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export const ProcessMeetingRequestSchema = z.object({
  langHint: z.enum(["ru", "kz", "mixed"]).default("mixed"),
});
export type ProcessMeetingRequest = z.infer<typeof ProcessMeetingRequestSchema>;
