import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@hackalem/contracts";
import { ApiError, apiFetch } from "@/lib/api";

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(input: LoginRequest) {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export async function register(input: RegisterRequest) {
  return apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export async function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
