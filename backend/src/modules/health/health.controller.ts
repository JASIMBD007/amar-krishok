import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      name: "amar-krishok-backend",
      schema: "upazilla-grade-v1",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
