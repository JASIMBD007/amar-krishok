import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { Response } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OptionalAuthGuard } from "../auth/guards/optional-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PUBLIC_UPLOAD_PURPOSE, UploadsService } from "./uploads.service";

@ApiTags("uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(OptionalAuthGuard)
  @Get(":id")
  async show(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser | undefined, @Res() response: Response) {
    const uploadedFile = await this.uploadsService.getUpload(id, user);
    const isPublicUpload = uploadedFile.purpose === PUBLIC_UPLOAD_PURPOSE;
    response.setHeader("Cache-Control", isPublicUpload ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable");
    response.setHeader("Content-Disposition", `inline; filename="${uploadedFile.key}"`);
    response.setHeader("Content-Length", uploadedFile.size.toString());
    response.setHeader("Content-Type", uploadedFile.mimeType);
    response.setHeader("X-Content-Type-Options", "nosniff");
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
