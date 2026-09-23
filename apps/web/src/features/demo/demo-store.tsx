"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { allTasks, meetings as seedMeetings } from "@/features/meetings/mock-data";
import type { MeetingTask, MeetingView } from "@/features/meetings/types";

const STORAGE_KEY = "hattama-demo-v2";

type DemoOutcome = "success" | "error";
type PersistedState = {
  meetings: MeetingView[];
  confirmedMeetingIds: string[];
  outcome: DemoOutcome;
};

type DemoStore = PersistedState & {
  hydrated: boolean;
  audioUrls: Record<string, string>;
  getMeeting: (id: string) => MeetingView | undefined;
  updateMeeting: (id: string, update: (meeting: MeetingView) => MeetingView) => void;
  updateTask: (task: MeetingTask) => void;
  addMeeting: (meeting: MeetingView, audioUrl?: string) => void;
  setAudioUrl: (meetingId: string, url: string) => void;
  setOutcome: (outcome: DemoOutcome) => void;
  setConfirmed: (meetingId: string, value: boolean) => void;
  reset: () => void;
};

const seedState: PersistedState = {
  meetings: seedMeetings.map((meeting) => ({
    ...meeting,
    tasks: meeting.tasks.map((task) => ({ ...task })),
    transcript: meeting.transcript.map((segment) => ({ ...segment })),
  })),
  confirmedMeetingIds: [],
  outcome: "success",
};

const DemoContext = createContext<DemoStore | null>(null);

function readState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(parsed.meetings)) return seedState;
    return {
      meetings: parsed.meetings,
      confirmedMeetingIds: parsed.confirmedMeetingIds ?? [],
      outcome: parsed.outcome === "error" ? "error" : "success",
    };
  } catch {
    return seedState;
  }
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // localStorage is client-only; reading it after mount keeps SSR hydration deterministic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const updateMeeting = useCallback((id: string, update: (meeting: MeetingView) => MeetingView) => {
    setState((current) => ({
      ...current,
      meetings: current.meetings.map((meeting) => meeting.id === id ? update(meeting) : meeting),
    }));
  }, []);

  const updateTask = useCallback((task: MeetingTask) => {
    updateMeeting(task.meetingId, (meeting) => ({
      ...meeting,
      tasks: meeting.tasks.map((item) => item.id === task.id ? task : item),
    }));
  }, [updateMeeting]);

  const setAudioUrl = useCallback((meetingId: string, url: string) => {
    setAudioUrls((current) => {
      const previous = current[meetingId];
      if (previous && previous !== url) URL.revokeObjectURL(previous);
      return { ...current, [meetingId]: url };
    });
  }, []);

  const addMeeting = useCallback((meeting: MeetingView, audioUrl?: string) => {
    setState((current) => ({
      ...current,
      meetings: [meeting, ...current.meetings.filter((item) => item.id !== meeting.id)],
    }));
    if (audioUrl) setAudioUrl(meeting.id, audioUrl);
  }, [setAudioUrl]);

  const setOutcome = useCallback((outcome: DemoOutcome) => {
    setState((current) => ({ ...current, outcome }));
  }, []);

  const setConfirmed = useCallback((meetingId: string, value: boolean) => {
    setState((current) => ({
      ...current,
      confirmedMeetingIds: value
        ? Array.from(new Set([...current.confirmedMeetingIds, meetingId]))
        : current.confirmedMeetingIds.filter((id) => id !== meetingId),
    }));
  }, []);

  const reset = useCallback(() => {
    Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
    setAudioUrls({});
    setState(seedState);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [audioUrls]);

  const value = useMemo<DemoStore>(() => ({
    ...state,
    hydrated,
    audioUrls,
    getMeeting: (id) => state.meetings.find((meeting) => meeting.id === id),
    updateMeeting,
    updateTask,
    addMeeting,
    setAudioUrl,
    setOutcome,
    setConfirmed,
    reset,
  }), [state, hydrated, audioUrls, updateMeeting, updateTask, addMeeting, setAudioUrl, setOutcome, setConfirmed, reset]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoStore() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemoStore must be used inside DemoProvider");
  return value;
}

export function getSeedTaskCount() {
  return allTasks.length;
}
