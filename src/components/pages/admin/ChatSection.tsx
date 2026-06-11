import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MessageSquareText, Send, UserRoundCheck } from "lucide-react";
import { useTranslate } from "../../../i18n";
import type { ChatParticipantRole, ChatThread } from "../../../types";
import { chatThreadMatchesSearch } from "./searchHelpers";

function getParticipantLabel(role: ChatParticipantRole) {
  if (role === "buyer") {
    return "Buyer";
  }

  if (role === "farmer") {
    return "Seller / Farmer";
  }

  return "Guest";
}

export function ChatSection({
  chatThreads,
  onAdminReply,
  onThreadOpen,
  searchTerm = "",
}: {
  chatThreads: ChatThread[];
  onAdminReply: (threadId: string, text: string) => void;
  onThreadOpen: (threadId: string) => void;
  searchTerm?: string;
}) {
  const t = useTranslate();
  const sortedThreads = useMemo(
    () => [...chatThreads].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()),
    [chatThreads],
  );
  const filteredThreads = useMemo(
    () => sortedThreads.filter((thread) => chatThreadMatchesSearch(searchTerm, thread, t)),
    [searchTerm, sortedThreads, t],
  );
  const [activeThreadId, setActiveThreadId] = useState(sortedThreads[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const activeThread = filteredThreads.find((thread) => thread.id === activeThreadId) ?? filteredThreads[0];

  useEffect(() => {
    if (filteredThreads.length === 0) {
      if (activeThreadId) {
        setActiveThreadId("");
      }
      return;
    }

    if (!filteredThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(filteredThreads[0].id);
    }
  }, [activeThreadId, filteredThreads]);

  useEffect(() => {
    if (activeThread?.status === "waiting") {
      onThreadOpen(activeThread.id);
    }
  }, [activeThread?.id, activeThread?.status, onThreadOpen]);

  const submitReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanReply = reply.trim();

    if (!activeThread || !cleanReply) {
      return;
    }

    onAdminReply(activeThread.id, cleanReply);
    setReply("");
  };

  if (sortedThreads.length === 0) {
    return (
      <section className="dashboard-grid admin-focused-grid">
        <section className="panel chat-admin-empty">
          <MessageSquareText size={24} />
          <span>{t("Admin chat inbox")}</span>
          <h2>{t("No conversations yet")}</h2>
          <p>{t("Buyer, seller, and guest messages will appear here.")}</p>
        </section>
      </section>
    );
  }

  if (!activeThread) {
    return (
      <section className="dashboard-grid admin-focused-grid">
        <section className="panel chat-admin-empty">
          <MessageSquareText size={24} />
          <span>{t("Admin chat inbox")}</span>
          <h2>{t("No results match your search")}</h2>
          <p>{t("Try another order, farmer, district, or message keyword.")}</p>
        </section>
      </section>
    );
  }

  return (
    <section className="dashboard-grid admin-focused-grid">
      <section className="panel admin-chat-panel" aria-labelledby="admin-chat-heading">
        <div className="panel-header">
          <div>
            <span>{t("Admin chat inbox")}</span>
            <h2 id="admin-chat-heading">{t("Buyer, seller, and guest conversations")}</h2>
          </div>
          <MessageSquareText size={22} />
        </div>

        <div className="admin-chat-layout">
          <div className="chat-thread-list" aria-label={t("Conversations")}>
            {filteredThreads.map((thread) => {
              const latestMessage = thread.messages[thread.messages.length - 1];
              return (
                <button
                  className={thread.id === activeThread.id ? "active" : ""}
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                >
                  <span>
                    <strong>{thread.participantName}</strong>
                    <em>{t(getParticipantLabel(thread.participantRole))}</em>
                  </span>
                  <small>{latestMessage?.text ?? t("No messages yet")}</small>
                </button>
              );
            })}
          </div>

          <div className="chat-conversation">
            <div className="chat-conversation-header">
              <UserRoundCheck size={20} />
              <div>
                <strong>{activeThread.participantName}</strong>
                <span>{t(activeThread.subject)}</span>
              </div>
              <em>{t(activeThread.status)}</em>
            </div>

            <div className="chat-message-list">
              {activeThread.messages.map((message) => (
                <article className={`chat-message ${message.senderRole === "admin" ? "admin" : "participant"}`} key={message.id}>
                  <strong>{message.senderRole === "admin" ? t("Admin") : message.senderName}</strong>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>

            <form className="admin-chat-reply" onSubmit={submitReply}>
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder={t("Reply as admin...")}
                aria-label={t("Reply as admin...")}
              />
              <button className="primary-button" type="submit">
                <Send size={16} />
                {t("Reply")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </section>
  );
}
