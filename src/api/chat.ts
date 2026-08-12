import { apiRequest } from "./auth";
import type { ChatMessage, ChatParticipantRole, ChatSenderRole, ChatStatus, ChatThread } from "../types";

/** The API speaks Prisma's uppercase enums; the app speaks lowercase. Mapped in one place. */
type ApiChatThread = {
  id: string;
  participantId: string | null;
  participantName: string;
  participantPhone: string;
  participantRole: string;
  status: string;
  subject: string;
  updatedAt: string;
  participantReadAt: string | null;
  staffReadAt: string | null;
  messages: {
    id: string;
    createdAt: string;
    senderName: string;
    senderRole: string;
    text: string;
  }[];
};

/** A thread plus what the viewer has not read yet. */
export type MessageThread = ChatThread & { unread: number };

function toMessage(message: ApiChatThread["messages"][number]): ChatMessage {
  return {
    createdAt: message.createdAt,
    id: message.id,
    senderName: message.senderName,
    senderRole: message.senderRole.toLowerCase() as ChatSenderRole,
    text: message.text,
  };
}

/**
 * Unread is counted against the viewer's own read mark and only for messages the *other* side
 * sent, so your own reply never shows up as something you have not read.
 */
function unreadFor(thread: ApiChatThread, isStaff: boolean) {
  const readAt = isStaff ? thread.staffReadAt : thread.participantReadAt;
  const since = readAt ? new Date(readAt).getTime() : 0;

  return thread.messages.filter((message) => {
    const fromStaff = message.senderRole.toLowerCase() === "admin";
    const fromOtherSide = isStaff ? !fromStaff : fromStaff;
    return fromOtherSide && new Date(message.createdAt).getTime() > since;
  }).length;
}

function toMessageThread(thread: ApiChatThread, isStaff: boolean): MessageThread {
  return {
    id: thread.id,
    messages: thread.messages.map(toMessage),
    participantId: thread.participantId ?? undefined,
    participantName: thread.participantName,
    participantPhone: thread.participantPhone,
    participantRole: thread.participantRole.toLowerCase() as ChatParticipantRole,
    status: thread.status.toLowerCase() as ChatStatus,
    subject: thread.subject,
    unread: unreadFor(thread, isStaff),
    updatedAt: thread.updatedAt,
  };
}

export async function fetchMyThreads(accessToken: string, isStaff: boolean) {
  const threads = await apiRequest<ApiChatThread[]>("/api/chat/my-threads", { accessToken });
  return threads.map((thread) => toMessageThread(thread, isStaff));
}

/**
 * The sender fields are required by the DTO but not trusted: the server resolves identity from the
 * session and ignores what is claimed here. They are sent to satisfy validation, nothing more.
 */
export async function sendThreadMessage(
  accessToken: string,
  threadId: string,
  text: string,
  sender: { name: string; role: ChatSenderRole },
  isStaff: boolean,
) {
  const thread = await apiRequest<ApiChatThread>(`/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    accessToken,
    body: JSON.stringify({ senderName: sender.name, senderRole: sender.role, text }),
    method: "POST",
  });
  return toMessageThread(thread, isStaff);
}

export async function markThreadRead(accessToken: string, threadId: string, isStaff: boolean) {
  const thread = await apiRequest<ApiChatThread>(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, {
    accessToken,
    method: "POST",
  });
  return toMessageThread(thread, isStaff);
}

/**
 * Opens a conversation with staff. Used when someone messages support for the first time, and by
 * the admin console when staff start a conversation with a specific user.
 */
export async function openThread(
  accessToken: string,
  input: {
    participantId?: string;
    participantName: string;
    participantPhone: string;
    participantRole: "buyer" | "farmer";
    subject: string;
    text: string;
  },
  isStaff: boolean,
) {
  const thread = await apiRequest<ApiChatThread>("/api/chat/threads", {
    accessToken,
    body: JSON.stringify({
      message: input.text,
      participantId: input.participantId,
      participantName: input.participantName,
      participantPhone: input.participantPhone,
      participantRole: input.participantRole,
      subject: input.subject,
    }),
    method: "POST",
  });
  return toMessageThread(thread, isStaff);
}
