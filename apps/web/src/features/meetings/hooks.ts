"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExport, createMeeting, getMeeting, getMeetings, getTasks, updateParticipant, updateTask } from "./api";

export const meetingKeys = {
  all: ["meetings"] as const,
  detail: (id: string) => ["meetings", id] as const,
  tasks: ["tasks"] as const,
};

export function useMeetings() {
  return useQuery({ queryKey: meetingKeys.all, queryFn: getMeetings });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: () => getMeeting(id),
    refetchInterval: (query) => query.state.data?.status === "processing" ? 1500 : false,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMeeting,
    onSuccess: (meeting) => {
      queryClient.setQueryData(meetingKeys.detail(meeting.id), meeting);
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.tasks });
    },
  });
}

export function useTasks() {
  return useQuery({ queryKey: meetingKeys.tasks, queryFn: getTasks });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: updateTask, onSuccess: (task) => {
    void queryClient.invalidateQueries({ queryKey: meetingKeys.tasks });
    void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(task.meetingId) });
  } });
}

export function useUpdateParticipant(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: updateParticipant, onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingId) });
  } });
}

export function useCreateExport() {
  return useMutation({ mutationFn: createExport });
}
