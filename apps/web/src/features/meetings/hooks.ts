"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createMeeting, getMeeting, getMeetings } from "./api";

export const meetingKeys = {
  all: ["meetings"] as const,
  detail: (id: string) => ["meetings", id] as const,
};

export function useMeetings() {
  return useQuery({ queryKey: meetingKeys.all, queryFn: getMeetings });
}

export function useMeeting(id: string) {
  return useQuery({ queryKey: meetingKeys.detail(id), queryFn: () => getMeeting(id) });
}

export function useCreateMeeting() {
  return useMutation({ mutationFn: createMeeting });
}

