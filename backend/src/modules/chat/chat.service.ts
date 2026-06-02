import { Injectable, NotFoundException } from "@nestjs/common";
import { ChatStatus, Role } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
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
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  findThreads() {
    return this.prisma.chatThread.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createThread(dto: CreateChatThreadDto) {
    const thread = await this.prisma.chatThread.create({
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

    await this.notifications.notifyAdmins({
      body: `${dto.participantName}: ${dto.message}`,
      title: "New chat message",
    });

    return thread;
  }

  async createMessage(threadId: string, dto: CreateChatMessageDto) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Chat thread not found.");
    }

    const updatedThread = await this.prisma.chatThread.update({
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

    if (dto.senderRole !== "admin") {
      await this.notifications.notifyAdmins({
        body: `${dto.senderName}: ${dto.text}`,
        title: "New chat message",
      });
    } else if (thread.participantRole !== Role.GUEST) {
      await this.notifications.notifyUser(thread.participantId, {
        body: `${dto.senderName}: ${dto.text}`,
        title: "Admin replied to chat",
      });
    }

    return updatedThread;
  }
}
