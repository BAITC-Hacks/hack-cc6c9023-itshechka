import { z } from "zod";

export const ParticipantSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  speakerTag: z.string(),
  fullName: z.string().nullable(),
  role: z.string().nullable(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const UpdateParticipantRequestSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  role: z.string().max(200).optional(),
});
export type UpdateParticipantRequest = z.infer<typeof UpdateParticipantRequestSchema>;

export const UtteranceSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  participantId: z.string().nullable(),
  text: z.string(),
  startMs: z.number().int(),
  endMs: z.number().int(),
  order: z.number().int(),
});
export type Utterance = z.infer<typeof UtteranceSchema>;

export const TranscriptResponseSchema = z.object({
  meetingId: z.string(),
  participants: z.array(ParticipantSchema),
  utterances: z.array(UtteranceSchema),
});
export type TranscriptResponse = z.infer<typeof TranscriptResponseSchema>;

export const TopicSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  title: z.string(),
  order: z.number().int(),
});
export type Topic = z.infer<typeof TopicSchema>;

export const SummarySchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  topicId: z.string().nullable(),
  text: z.string(),
});
export type Summary = z.infer<typeof SummarySchema>;
