import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { User } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiException } from "../api-error";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { hashSessionToken, readSessionToken } from "./session";

export type AuthenticatedRequest = Request & { user: User; sessionToken: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== "http") return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(request);
    if (!token) throw new ApiException(401, "UNAUTHORIZED", "Требуется вход в систему");

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      throw new ApiException(401, "SESSION_EXPIRED", "Сессия истекла — войдите снова");
    }

    request.user = session.user;
    request.sessionToken = token;
    return true;
  }
}
