import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { LoginRequest, RegisterRequest } from "@hackalem/contracts";
import type { User } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiException } from "../../common/api-error";
import { hashSessionToken, SESSION_TTL_MS } from "../../common/auth/session";
import { hashPassword, verifyPassword } from "../../common/password";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterRequest) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ApiException(409, "EMAIL_TAKEN", "Аккаунт с таким email уже существует");
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        fullName: dto.fullName,
        organization: dto.organization || null,
      },
    });
    return { user: serializeUser(user), token: await this.createSession(user.id) };
  }

  async login(dto: LoginRequest) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new ApiException(401, "INVALID_CREDENTIALS", "Неверный email или пароль");
    }
    return { user: serializeUser(user), token: await this.createSession(user.id) };
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    await this.prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return token;
  }
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    organization: user.organization,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
