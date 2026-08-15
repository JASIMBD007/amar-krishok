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
export const PUBLIC_UPLOAD_PURPOSE = "crop-lot-image";
const IMAGE_UPLOAD_PURPOSES = new Set([PUBLIC_UPLOAD_PURPOSE, "profile-avatar"]);

function cleanPurpose(value?: string) {
  return value?.trim() || "general-upload";
}

/** Sniffs the real file type from its magic bytes; a client-supplied Content-Type header cannot be trusted. */
function sniffMimeType(buffer: Buffer): string | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return "image/gif";
  }

  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }

  return undefined;
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

    const uploadPurpose = cleanPurpose(purpose);
    const isImageOnly = IMAGE_UPLOAD_PURPOSES.has(uploadPurpose);
    const allowedTypes = isImageOnly ? allowedImageTypes : allowedDocumentTypes;
    const sniffedType = sniffMimeType(file.buffer);
    if (!sniffedType || !allowedTypes.has(sniffedType) || sniffedType !== file.mimetype) {
      throw new BadRequestException(isImageOnly ? "Image must be JPG, PNG, WEBP, or GIF." : "Document must be an image or PDF.");
    }

    const uploadId = randomUUID();
    const cleanUserRole = user.role === Role.ADMIN ? "admin" : user.role === Role.BUYER ? "buyer" : "farmer";
    const filename = `${cleanUserRole}-${user.id}-${Date.now()}-${uploadId.slice(0, 8)}${fileExtension(file)}`;
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

  async getUpload(id: string, requester?: AuthenticatedUser) {
    const uploadedFile = await this.prisma.uploadedFile.findUnique({
      where: { id },
    });

    if (!uploadedFile?.content) {
      throw new NotFoundException("File not found.");
    }

    const isPublic = uploadedFile.purpose === PUBLIC_UPLOAD_PURPOSE;
    const isOwnerOrAdmin = requester?.role === Role.ADMIN || requester?.id === uploadedFile.ownerId;
    if (!isPublic && !isOwnerOrAdmin) {
      // Report "not found" rather than "forbidden" so an unauthorized caller can't confirm a given id exists.
      throw new NotFoundException("File not found.");
    }

    return uploadedFile;
  }
}
