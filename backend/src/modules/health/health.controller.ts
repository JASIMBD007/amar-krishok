import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { STARTED_AT, buildCommit, shortCommit } from "./build-info";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  check() {
    const commit = buildCommit();

    return {
      name: "amar-krishok-backend",
      // Kept so anything already reading it keeps working. `commit` is the field to trust: this one
      // is a hardcoded string that does not change when the build does.
      schema: "lot-status-route-v3",
      commit,
      commitShort: shortCommit(commit),
      startedAt: STARTED_AT,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
