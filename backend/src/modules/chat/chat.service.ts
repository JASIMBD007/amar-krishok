import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ChatStatus, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
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

function toApiChatRole(role: Role): ApiChatRole {
  const roleMap = {
    [Role.ADMIN]: "admin",
    [Role.BUYER]: "buyer",
    [Role.FARMER]: "farmer",
    [Role.GUEST]: "guest",
  } satisfies Record<Role, ApiChatRole>;

  return roleMap[role];
}

/**
 * The client-supplied sender fields in the DTO can never be trusted directly: anyone could otherwise
 * claim senderRole "admin" or post as another user's senderId. When a valid session is present, identity
 * always comes from the authenticated user; only truly anonymous requests fall back to the guest identity
 * the client provided.
 */
function resolveEffectiveSender(
  thread: { participantId: string | null; participantRole: Role },
  requester: AuthenticatedUser | undefined,
  claimedName: string,
) {
  if (!requester) {
    return { id: undefined, name: claimedName, role: "guest" as ApiChatRole };
  }

  if (requester.role !== Role.ADMIN && requester.id !== thread.participantId) {
    throw new ForbiddenException("You can only reply in your own conversation.");
  }

  return { id: requester.id, name: requester.name, role: toApiChatRole(requester.role) };
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

  /**
   * The signed-in person's own conversations.
   *
   * Matched on participantId first. Threads opened before signing in carry no id, so phone and
   * role are the fallback — that is how a guest conversation becomes theirs once they register
   * with the same number.
   */
  async findMyThreads(user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      return this.findThreads();
    }

    return this.prisma.chatThread.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      where: {
        OR: [{ participantId: user.id }, { participantPhone: user.phone, participantRole: user.role }],
      },
    });
  }

  /**
   * Marks the caller's side read up to now. Staff and participant have separate marks so one
   * clearing their badge never clears the other's.
   */
  async markRead(threadId: string, user: AuthenticatedUser) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Conversation not found.");
    }

    const isStaff = user.role === Role.ADMIN;
    const isOwner = thread.participantId === user.id || thread.participantPhone === user.phone;
    if (!isStaff && !isOwner) {
      throw new ForbiddenException("You can only read your own conversation.");
    }

    return this.prisma.chatThread.update({
      data: isStaff ? { staffReadAt: new Date() } : { participantReadAt: new Date() },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      where: { id: threadId },
    });
  }

  async createThread(dto: CreateChatThreadDto, requester?: AuthenticatedUser) {
    const isTrustedParticipant = requester && requester.role !== Role.ADMIN;
    const participantId = isTrustedParticipant ? requester.id : undefined;
    const participantName = isTrustedParticipant ? requester.name : dto.participantName;
    const participantPhone = isTrustedParticipant ? requester.phone : dto.participantPhone;
    const participantRole = isTrustedParticipant ? requester.role : toPrismaRole(dto.participantRole);

    const thread = await this.prisma.chatThread.create({
      data: {
        messages: {
          create: {
            senderId: participantRole === Role.GUEST ? undefined : participantId,
            senderName: participantName,
            senderRole: participantRole,
            text: dto.message,
          },
        },
        participantId,
        participantName,
        participantPhone,
        participantRole,
        status: ChatStatus.WAITING,
        subject: dto.subject,
      },
      include: { messages: true },
    });

    await this.notifications.notifyAdmins({
      body: `${participantName}: ${dto.message}`,
      title: "New chat message",
    });

    return thread;
  }

  async createMessage(threadId: string, dto: CreateChatMessageDto, requester?: AuthenticatedUser) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Chat thread not found.");
    }

    const sender = resolveEffectiveSender(thread, requester, dto.senderName);

    const updatedThread = await this.prisma.chatThread.update({
      data: {
        messages: {
          create: {
            senderId: sender.role === "guest" ? undefined : sender.id,
            senderName: sender.name,
            senderRole: toPrismaRole(sender.role),
            text: dto.text,
          },
        },
        status: sender.role === "admin" ? ChatStatus.OPEN : ChatStatus.WAITING,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      where: { id: threadId },
    });

    if (sender.role !== "admin") {
      await this.notifications.notifyAdmins({
        body: `${sender.name}: ${dto.text}`,
        title: "New chat message",
      });
    } else if (thread.participantRole !== Role.GUEST && thread.participantId) {
      await this.notifications.notifyUser(thread.participantId, {
        body: `${sender.name}: ${dto.text}`,
        title: "Admin replied to chat",
      });
    }

    return updatedThread;
  }
}
