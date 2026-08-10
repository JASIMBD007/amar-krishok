import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateLotDto, UpdateLotDto, UpdateLotStatusDto } from "./dto/create-lot.dto";
import { AddLotPhotoDto, UpdateLotPhotoDto } from "./dto/lot-photo.dto";
import { LotsService } from "./lots.service";

@ApiTags("lots")
@Controller("lots")
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  findAll(@Query("district") district?: string, @Query("crop") crop?: string) {
    return this.lotsService.findAll({ crop, district });
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Get("mine")
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.findMine(user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Post()
  create(@Body() dto: CreateLotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.create(dto, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateLotStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.setStatus(id, dto.status, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.update(id, dto, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Post(":id/photos")
  addPhoto(@Param("id") id: string, @Body() dto: AddLotPhotoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.addPhoto(id, dto.url, dto.caption, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Patch(":id/photos/:photoId")
  updatePhoto(
    @Param("id") id: string,
    @Param("photoId") photoId: string,
    @Body() dto: UpdateLotPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lotsService.updatePhoto(id, photoId, dto, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Delete(":id/photos/:photoId")
  removePhoto(@Param("id") id: string, @Param("photoId") photoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.removePhoto(id, photoId, user);
  }

  @Auth(Role.ADMIN)
  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.lotsService.review(id, "approve");
  }

  @Auth(Role.ADMIN)
  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.lotsService.review(id, "reject");
  }
}
