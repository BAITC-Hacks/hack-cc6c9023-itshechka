"use client";

import type { LoginRequest, RegisterRequest, User } from "@hackalem/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { getCurrentUser, login, logout, register } from "./api";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  signIn: (input: LoginRequest) => Promise<User>;
  signUp: (input: RegisterRequest) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const authKey = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const currentUser = useQuery({ queryKey: authKey, queryFn: getCurrentUser, retry: false, staleTime: 5 * 60_000 });
  const loginMutation = useMutation({ mutationFn: login });
  const registerMutation = useMutation({ mutationFn: register });
  const logoutMutation = useMutation({ mutationFn: logout });

  const value: AuthContextValue = {
    user: currentUser.data ?? null,
    isLoading: currentUser.isLoading,
    isError: currentUser.isError,
    signIn: async (input) => {
      const response = await loginMutation.mutateAsync(input);
      queryClient.setQueryData(authKey, response.user);
      return response.user;
    },
    signUp: async (input) => {
      const response = await registerMutation.mutateAsync(input);
      queryClient.setQueryData(authKey, response.user);
      return response.user;
    },
    signOut: async () => {
      try { await logoutMutation.mutateAsync(); } finally {
        queryClient.setQueryData(authKey, null);
        queryClient.removeQueries({ queryKey: ["meetings"] });
        queryClient.removeQueries({ queryKey: ["tasks"] });
      }
    },
    refresh: () => { void currentUser.refetch(); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
