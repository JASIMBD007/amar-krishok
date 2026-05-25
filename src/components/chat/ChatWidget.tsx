import { useState } from "react";
import type { FormEvent } from "react";
import { MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { useTranslate } from "../../i18n";
import type { AuthUser, ChatThread } from "../../types";

export function ChatWidget({
  chatThreads,
  subject,
  user,
  onSendMessage,
}: {
  chatThreads: ChatThread[];
  subject: string;
  user: AuthUser | null;
  onSendMessage: (user: AuthUser, text: string, subject: string) => void;
}) {
  const t = useTranslate();
  const [message, setMessage] = useState("");
  const thread =
    user && user.role !== "admin"
      ? chatThreads.find((item) => item.participantRole === user.role && item.participantPhone === user.phone)
      : null;
  const visibleMessages = thread?.messages.slice(-4) ?? [];

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || user.role === "admin") {
      return;
    }

    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return;
    }

    onSendMessage(user, cleanMessage, subject);
    setMessage("");
  };

  if (!user || user.role === "admin") {
    return null;
  }

  return (
    <aside className="panel chat-widget" aria-label={t("Chat with admin")}>
      <div className="chat-widget-header">
        <div>
          <span>{t("Support chat")}</span>
          <h3>{t("Chat with admin")}</h3>
        </div>
        <MessageSquareText size={22} />
      </div>

      <div className="chat-thread-preview">
        {visibleMessages.length === 0 ? (
          <div className="chat-empty">
            <ShieldCheck size={18} />
            <span>{t("Ask about approval, delivery, or payment. Admin will reply here.")}</span>
          </div>
        ) : (
          visibleMessages.map((item) => (
            <div className={`chat-bubble ${item.senderRole === "admin" ? "admin" : "participant"}`} key={item.id}>
              <strong>{item.senderRole === "admin" ? t("Admin") : item.senderName}</strong>
              <p>{item.text}</p>
            </div>
          ))
        )}
      </div>

      <form className="chat-compose" onSubmit={submitMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("Type your message...")}
          aria-label={t("Type your message...")}
        />
        <button className="primary-button" type="submit">
          <Send size={16} />
          {t("Send")}
        </button>
      </form>
    </aside>
  );
}
