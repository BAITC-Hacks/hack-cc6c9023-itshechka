import { z } from "zod";

/**
 * Внутренний контракт backend <-> AI worker (STT + диаризация + извлечение
 * поручений + сегментация по темам). Не выставляется фронту.
 */

export const AiProcessRequestSchema = z.object({
  meetingId: z.string(),
  audioUrl: z.string(),
  langHint: z.enum(["ru", "kz", "mixed"]).default("mixed"),
  callbackUrl: z.string(), // куда worker пришлёт результат (webhook)
});
export type AiProcessRequest = z.infer<typeof AiProcessRequestSchema>;

export const AiSpeakerSchema = z.object({
  speakerTag: z.string(), // "SPEAKER_00"
  fullNameGuess: z.string().nullable().optional(),
  roleGuess: z.string().nullable().optional(),
});

export const AiUtteranceSchema = z.object({
  speakerTag: z.string(),
  text: z.string(),
  startMs: z.number().int(),
  endMs: z.number().int(),
  order: z.number().int(),
});

export const AiTopicSchema = z.object({
  title: z.string(),
  order: z.number().int(),
  startUtteranceOrder: z.number().int(),
  endUtteranceOrder: z.number().int(),
});

export const AiTaskSchema = z.object({
  description: z.string(),
  responsibleSpeakerTag: z.string().nullable().optional(),
  responsibleRaw: z.string().nullable().optional(),
  dueDateIso: z.string().nullable().optional(),
  dueRaw: z.string().nullable().optional(),
  topicOrder: z.number().int().nullable().optional(),
  sourceUtteranceOrder: z.number().int().nullable().optional(),
});

export const AiSummarySchema = z.object({
  topicOrder: z.number().int().nullable(), // null = summary всей встречи
  text: z.string(),
});

export const AiProcessResultSchema = z.object({
  meetingId: z.string(),
  durationSec: z.number().int().optional(),
  speakers: z.array(AiSpeakerSchema),
  utterances: z.array(AiUtteranceSchema),
  topics: z.array(AiTopicSchema),
  tasks: z.array(AiTaskSchema),
  summaries: z.array(AiSummarySchema),
});
export type AiProcessResult = z.infer<typeof AiProcessResultSchema>;
