import { z } from "zod";

export const UserRoleSchema = z.enum(["ADMIN", "MEMBER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  organization: z.string().nullable(),
  role: UserRoleSchema,
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().email("Введите корректный email").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Введите пароль").max(72),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Укажите имя").max(120),
  email: z.string().trim().email("Введите корректный email").transform((value) => value.toLowerCase()),
  organization: z.string().trim().max(160).optional(),
  password: z.string()
    .min(8, "Минимум 8 символов")
    .max(72)
    .regex(/[A-ZА-Я]/, "Добавьте заглавную букву")
    .regex(/[a-zа-я]/, "Добавьте строчную букву")
    .regex(/\d/, "Добавьте цифру"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthResponseSchema = z.object({ user: UserSchema });
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
