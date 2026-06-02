import type { ChatThread } from "../../types";

const CHAT_SEEN_STORAGE_KEY = "amarKrishokSeenChatMessages";

export function readSeenChatMessageIds() {
  try {
    const savedIds = window.localStorage.getItem(CHAT_SEEN_STORAGE_KEY);
    return savedIds ? (JSON.parse(savedIds) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveSeenChatMessageIds(ids: string[]) {
  try {
    window.localStorage.setItem(CHAT_SEEN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // The badge still works for the current session if local storage is unavailable.
  }
}

export function getAdminReplyIds(thread: ChatThread | null | undefined) {
  return thread?.messages.filter((message) => message.senderRole === "admin").map((message) => message.id) ?? [];
}

export function countUnseenAdminReplies(thread: ChatThread | null | undefined, seenMessageIds: string[]) {
  const seenSet = new Set(seenMessageIds);
  return getAdminReplyIds(thread).filter((id) => !seenSet.has(id)).length;
}

export function countAdminChatAttention(chatThreads: ChatThread[]) {
  return chatThreads.filter((thread) => {
    const latestMessage = thread.messages[thread.messages.length - 1];
    return thread.status === "waiting" || latestMessage?.senderRole !== "admin";
  }).length;
}
