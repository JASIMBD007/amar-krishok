import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

type UploadedMemoryFile = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedDocumentTypes = new Set([...allowedImageTypes, "application/pdf"]);

function cleanPurpose(value?: string) {
  return value?.trim() || "general-upload";
}

function fileExtension(file: UploadedMemoryFile) {
  const currentExt = extname(file.originalname ?? "").toLowerCase();
  if (currentExt) {
    return currentExt;
  }

  if (file.mimetype === "image/jpeg") {
    return ".jpg";
  }

  if (file.mimetype === "image/png") {
    return ".png";
  }

  if (file.mimetype === "image/webp") {
    return ".webp";
  }

  if (file.mimetype === "image/gif") {
    return ".gif";
  }

  if (file.mimetype === "application/pdf") {
    return ".pdf";
  }

  return "";
}

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveUserUpload(user: AuthenticatedUser, file: UploadedMemoryFile | undefined, purpose?: string) {
    if (!file?.buffer || !file.mimetype || !file.originalname) {
      throw new BadRequestException("Please choose a file to upload.");
    }

    const isCropImage = cleanPurpose(purpose) === "crop-lot-image";
    const allowedTypes = isCropImage ? allowedImageTypes : allowedDocumentTypes;
    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestException(isCropImage ? "Crop image must be JPG, PNG, WEBP, or GIF." : "Document must be an image or PDF.");
    }

    const uploadId = randomUUID();
    const cleanUserRole = user.role === Role.ADMIN ? "admin" : user.role === Role.BUYER ? "buyer" : "farmer";
    const filename = `${cleanUserRole}-${user.id}-${Date.now()}-${uploadId.slice(0, 8)}${fileExtension(file)}`;
    const uploadPurpose = cleanPurpose(purpose);
    const fileContent = Uint8Array.from(file.buffer);

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        content: fileContent,
        id: uploadId,
        key: filename,
        mimeType: file.mimetype,
        ownerId: user.id,
        purpose: uploadPurpose,
        size: file.size ?? file.buffer.length,
        url: `/api/uploads/${uploadId}`,
      },
    });

    const { content: _content, ...metadata } = uploadedFile;
    return metadata;
  }

  async getUpload(id: string) {
    const uploadedFile = await this.prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (!uploadedFile?.content) {
      throw new NotFoundException("File not found.");
    }

    return uploadedFile;
  }
}
