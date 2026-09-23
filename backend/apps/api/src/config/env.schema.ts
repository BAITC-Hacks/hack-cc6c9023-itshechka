import { z } from "zod";

export const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FRONTEND_URL: z.string().min(1).default("http://localhost:3000"),
  JWT_SECRET: z.string().min(1).default("change-me-for-local-demo"),
  AI_WORKER_URL: z.string().min(1).default("http://localhost:5000"),
  PUBLIC_API_URL: z.string().min(1).default("http://localhost:4000/api/v1"),
  AUDIO_STORAGE_DIR: z.string().min(1).default("./storage/audio"),
  EXPORT_STORAGE_DIR: z.string().min(1).default("./storage/exports"),
});
export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    // Fail fast: app must not boot with an invalid/missing config.
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
