import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { validateEnv } from "./config/env.schema";
import { PrismaModule } from "./prisma/prisma.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { HealthModule } from "./modules/health/health.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { TranscriptModule } from "./modules/transcript/transcript.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { AiModule } from "./modules/ai/ai.module";
import { LiveModule } from "./modules/live/live.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuthGuard } from "./common/auth/auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    MeetingsModule,
    TranscriptModule,
    TasksModule,
    AiModule,
    LiveModule,
    ExportsModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
