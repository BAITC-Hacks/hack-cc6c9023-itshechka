import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/auth/public.decorator";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
