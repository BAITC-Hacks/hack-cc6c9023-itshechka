import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { WsAdapter } from "@nestjs/platform-ws";
import { AppModule } from "./app.module";
import type { Env } from "./config/env.schema";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  // Swagger set up BEFORE the global prefix so it stays reachable at /api/docs
  // instead of /api/v1/api/docs.
  const swaggerDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("HackAlem AI — Meeting Protocol API")
      .setDescription("Backend REST API for meeting auto-protocoling with task extraction")
      .setVersion("0.1.0")
      .build(),
  );
  SwaggerModule.setup("api/docs", app, swaggerDoc);

  app.setGlobalPrefix("api/v1", { exclude: ["api/docs", "api/docs-json"] });

  app.enableCors({
    origin: config.get("FRONTEND_URL", { infer: true }),
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger on http://localhost:${port}/api/docs`);
}

bootstrap();
