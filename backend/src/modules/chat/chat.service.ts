import { Injectable, NotFoundException } from "@nestjs/common";
import { ChatStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ApiChatRole, CreateChatMessageDto, CreateChatThreadDto } from "./dto/chat.dto";

function toPrismaRole(role: ApiChatRole) {
  const roleMap = {
    admin: Role.ADMIN,
    buyer: Role.BUYER,
    farmer: Role.FARMER,
    guest: Role.GUEST,
  } satisfies Record<ApiChatRole, Role>;

  return roleMap[role];
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  findThreads() {
    return this.prisma.chatThread.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  createThread(dto: CreateChatThreadDto) {
    return this.prisma.chatThread.create({
      data: {
        messages: {
          create: {
            senderId: dto.participantRole === "guest" ? undefined : dto.participantId,
            senderName: dto.participantName,
            senderRole: toPrismaRole(dto.participantRole),
            text: dto.message,
          },
        },
        participantId: dto.participantId,
        participantName: dto.participantName,
        participantPhone: dto.participantPhone,
        participantRole: toPrismaRole(dto.participantRole),
        status: ChatStatus.WAITING,
        subject: dto.subject,
      },
      include: { messages: true },
    });
  }

  async createMessage(threadId: string, dto: CreateChatMessageDto) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Chat thread not found.");
    }

    return this.prisma.chatThread.update({
      data: {
        messages: {
          create: {
            senderId: dto.senderRole === "guest" ? undefined : dto.senderId,
            senderName: dto.senderName,
            senderRole: toPrismaRole(dto.senderRole),
            text: dto.text,
          },
        },
        status: dto.senderRole === "admin" ? ChatStatus.OPEN : ChatStatus.WAITING,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      where: { id: threadId },
    });
  }
}
