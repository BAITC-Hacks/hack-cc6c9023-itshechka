import type { Meeting, Task, Topic, Utterance, Participant, Summary, Export } from "@prisma/client";

export function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

export function serializeMeeting(m: Meeting) {
  return {
    id: m.id,
    title: m.title,
    organization: m.organization,
    sourceType: m.sourceType,
    status: m.status,
    audioUrl: m.audioUrl,
    durationSec: m.durationSec,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeParticipant(p: Participant) {
  return {
    id: p.id,
    meetingId: p.meetingId,
    speakerTag: p.speakerTag,
    fullName: p.fullName,
    role: p.role,
  };
}

export function serializeUtterance(u: Utterance) {
  return {
    id: u.id,
    meetingId: u.meetingId,
    participantId: u.participantId,
    text: u.text,
    startMs: u.startMs,
    endMs: u.endMs,
    order: u.order,
  };
}

export function serializeTopic(t: Topic) {
  return {
    id: t.id,
    meetingId: t.meetingId,
    title: t.title,
    order: t.order,
  };
}

export function serializeSummary(s: Summary) {
  return {
    id: s.id,
    meetingId: s.meetingId,
    topicId: s.topicId,
    text: s.text,
  };
}

export function serializeTask(t: Task) {
  return {
    id: t.id,
    meetingId: t.meetingId,
    topicId: t.topicId,
    description: t.description,
    responsibleId: t.responsibleId,
    responsibleRaw: t.responsibleRaw,
    dueDate: toIso(t.dueDate),
    dueRaw: t.dueRaw,
    status: t.status,
    sourceUtteranceId: t.sourceUtteranceId,
    createdAt: t.createdAt.toISOString(),
  };
}

export function serializeExport(e: Export) {
  return {
    id: e.id,
    meetingId: e.meetingId,
    format: e.format,
    fileUrl: e.fileUrl,
    createdAt: e.createdAt.toISOString(),
  };
}
