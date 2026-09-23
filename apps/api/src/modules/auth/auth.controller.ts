import { Body, Controller, Get, HttpCode, Post, Req, Res, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { LoginRequestSchema, RegisterRequestSchema, type LoginRequest, type RegisterRequest } from "@hackalem/contracts";
import { Public } from "../../common/auth/public.decorator";
import { SESSION_COOKIE, SESSION_TTL_MS } from "../../common/auth/session";
import type { AuthenticatedRequest } from "../../common/auth/auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService, serializeUser } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @UsePipes(new ZodValidationPipe(RegisterRequestSchema))
  async register(@Body() dto: RegisterRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Public()
  @Post("login")
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  async login(@Body() dto: LoginRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Get("me")
  me(@Req() request: AuthenticatedRequest) {
    return serializeUser(request.user);
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.sessionToken);
    response.clearCookie(SESSION_COOKIE, cookieOptions());
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function setSessionCookie(response: Response, token: string) {
  response.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_MS });
}
