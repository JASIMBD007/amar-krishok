import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Send, ShieldCheck, X } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, ChatParticipant, ChatThread } from "../../types";
import { countUnseenAdminReplies, getAdminReplyIds, readSeenChatMessageIds, saveSeenChatMessageIds } from "./chatUnread";

const GUEST_ID_STORAGE_KEY = "amarKrishokGuestChatId";
const GUEST_NAME_STORAGE_KEY = "amarKrishokGuestChatName";
const GUEST_PHONE_STORAGE_KEY = "amarKrishokGuestChatPhone";

function readStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function makeGuestId() {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readGuestId() {
  const storedId = readStoredValue(GUEST_ID_STORAGE_KEY);
  if (storedId) {
    return storedId;
  }

  const nextId = makeGuestId();
  try {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, nextId);
  } catch {
    // Local storage can be unavailable in private contexts; the in-memory id still keeps this session usable.
  }
  return nextId;
}

function makeParticipantThreadId(participant: ChatParticipant) {
  const cleanPhone = participant.phone.replace(/\D/g, "") || "unknown";
  return `${participant.role}-${participant.id || cleanPhone}`;
}

export function FloatingSupportChat({
  chatThreads,
  user,
  onSendMessage,
}: {
  chatThreads: ChatThread[];
  user: AuthUser | null;
  onSendMessage: (participant: ChatParticipant, text: string, subject: string) => void;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [isOpen, setIsOpen] = useState(false);
  const [guestId] = useState(() => readGuestId());
  const [guestName, setGuestName] = useState(() => readStoredValue(GUEST_NAME_STORAGE_KEY));
  const [guestPhone, setGuestPhone] = useState(() => readStoredValue(GUEST_PHONE_STORAGE_KEY));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [seenMessageIds, setSeenMessageIds] = useState<string[]>(() => readSeenChatMessageIds());

  const participant = useMemo<ChatParticipant | null>(() => {
    if (user?.role === "admin") {
      return null;
    }

    if (user) {
      return {
        id: user.accountId ?? (user.phone.replace(/\D/g, "") || "unknown"),
        name: user.name,
        phone: user.phone,
        role: user.role,
      };
    }

    return {
      id: guestId,
      name: guestName.trim(),
      phone: guestPhone.trim(),
      role: "guest",
    };
  }, [guestId, guestName, guestPhone, user]);

  const thread = participant
    ? chatThreads.find(
        (item) =>
          item.id === makeParticipantThreadId(participant) ||
          (item.participantId === participant.id && item.participantRole === participant.role) ||
          (item.participantRole === participant.role && item.participantPhone === participant.phone),
      )
    : null;
  const visibleMessages = thread?.messages.slice(-5) ?? [];
  const adminReplyIds = useMemo(() => getAdminReplyIds(thread), [thread]);
  const unreadReplyCount = isOpen ? 0 : countUnseenAdminReplies(thread, seenMessageIds);
  const needsGuestInfo = !user;

  useEffect(() => {
    if (!isOpen || adminReplyIds.length === 0) {
      return;
    }

    setSeenMessageIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, ...adminReplyIds]));
      saveSeenChatMessageIds(nextIds);
      return nextIds;
    });
  }, [adminReplyIds, isOpen]);

  const saveGuestContact = () => {
    try {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, guestName.trim());
      window.localStorage.setItem(GUEST_PHONE_STORAGE_KEY, guestPhone.trim());
    } catch {
      // The chat continues in the current session even if contact details cannot be persisted.
    }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!participant) {
      return;
    }

    const cleanMessage = message.trim();
    const cleanName = participant.name.trim();
    const cleanPhone = participant.phone.trim();

    if (needsGuestInfo && !cleanName) {
      setError(t("Please enter your name."));
      return;
    }

    if (needsGuestInfo && cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (!cleanMessage) {
      setError(t("Please type a message."));
      return;
    }

    saveGuestContact();
    onSendMessage({ ...participant, name: cleanName, phone: cleanPhone }, cleanMessage, "General admin support");
    setMessage("");
    setError("");
  };

  if (user?.role === "admin") {
    return null;
  }

  return (
    <aside className={`floating-chat ${isOpen ? "open" : ""}`} aria-label={t("Admin support")}>
      {isOpen && (
        <section className="floating-chat-panel" aria-labelledby="floating-chat-title">
          <div className="floating-chat-header">
            <div>
              <span>{t("Admin support")}</span>
              <h2 id="floating-chat-title">{t("Need help? Chat with us")}</h2>
            </div>
            <button className="icon-button close-button" type="button" aria-label={t("Close chat")} onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="floating-chat-messages">
            {visibleMessages.length === 0 ? (
              <div className="chat-empty">
                <ShieldCheck size={18} />
                <span>{t("Ask about crops, orders, registration, or payments.")}</span>
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

          <form className="floating-chat-form" onSubmit={submitMessage}>
            {needsGuestInfo && (
              <div className="floating-chat-contact">
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder={t("Full name")} aria-label={t("Full name")} />
                <input
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  inputMode="tel"
                  placeholder={v("01700000000")}
                  aria-label={t("Mobile number")}
                />
              </div>
            )}
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("Type your message...")}
              aria-label={t("Type your message...")}
            />
            {error && <p className="floating-chat-error">{error}</p>}
            <button className="primary-button" type="submit">
              <Send size={16} />
              {t("Send")}
            </button>
          </form>
        </section>
      )}

      <button className="floating-chat-button" type="button" aria-label={t("Chat with admin")} onClick={() => setIsOpen((value) => !value)}>
        <MessageCircle size={25} />
        <span>{t("Chat")}</span>
        {unreadReplyCount > 0 && (
          <strong className="floating-chat-badge" aria-label={t("Unread chat messages")}>
            {v(unreadReplyCount)}
          </strong>
        )}
      </button>
    </aside>
  );
}
