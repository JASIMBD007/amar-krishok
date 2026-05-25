import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateLotDto } from "./dto/create-lot.dto";
import { LotsService } from "./lots.service";

@ApiTags("lots")
@Controller("lots")
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  findAll(@Query("district") district?: string, @Query("crop") crop?: string) {
    return this.lotsService.findAll({ crop, district });
  }

  @Post()
  create(@Body() dto: CreateLotDto) {
    return this.lotsService.create(dto);
  }
}
