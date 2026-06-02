import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { Response } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { UploadsService } from "./uploads.service";

@ApiTags("uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get(":id")
  async show(@Param("id") id: string, @Res() response: Response) {
    const uploadedFile = await this.uploadsService.getUpload(id);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.setHeader("Content-Disposition", `inline; filename="${uploadedFile.key}"`);
    response.setHeader("Content-Length", uploadedFile.size.toString());
    response.setHeader("Content-Type", uploadedFile.mimeType);
    response.send(Buffer.from(uploadedFile.content ?? []));
  }

  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      properties: {
        file: { format: "binary", type: "string" },
        purpose: { type: "string" },
      },
      type: "object",
    },
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: unknown, @Body("purpose") purpose?: string) {
    return this.uploadsService.saveUserUpload(user, file as Parameters<UploadsService["saveUserUpload"]>[1], purpose);
  }
}
