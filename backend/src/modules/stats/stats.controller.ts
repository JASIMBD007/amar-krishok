import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StatsService } from "./stats.service";

@ApiTags("stats")
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /** Public: the landing page reads this before anyone signs in. */
  @Get("platform")
  platform() {
    return this.statsService.platform();
  }
}
