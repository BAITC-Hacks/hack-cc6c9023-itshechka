import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
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
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
