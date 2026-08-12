import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, X } from "lucide-react";
import { ApiRequestError } from "../../api/auth";
import { fetchMyThreads, markThreadRead, sendThreadMessage, type MessageThread } from "../../api/chat";
import { useTranslate } from "../../i18n";
import type { AuthUser, ChatSenderRole } from "../../types";
import { ListLoading } from "../EmptyState";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function timeLabel(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const sameDay = new Date().toDateString() === date.toDateString();
  return date.toLocaleString(locale, sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" });
}

/**
 * The messages surface: a thread list that swaps to a conversation, in one panel anchored under
 * the header icon.
 *
 * Staff see every conversation and reply as support; a farmer or buyer sees only their own. The
 * same component serves both because the only real difference is whose messages sit on the right.
 */
export function MessengerPanel({
  focusThreadId,
  locale,
  onClose,
  onUnreadChange,
  user,
}: {
  /** Set when staff opened this from a user record, so it lands straight in that conversation. */
  focusThreadId?: string | null;
  locale: string;
  onClose: () => void;
  onUnreadChange: (total: number) => void;
  user: AuthUser;
}) {
  const t = useTranslate();
  const isStaff = user.role === "admin";
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [openId, setOpenId] = useState<string | null>(focusThreadId ?? null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const accessToken = user.accessToken;
  const openThread = threads.find((thread) => thread.id === openId) ?? null;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetchMyThreads(accessToken, isStaff)
      .then((result) => {
        setThreads(result);
        setError("");
        onUnreadChange(result.reduce((total, thread) => total + thread.unread, 0));
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load messages.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, isStaff, onUnreadChange]);

  useEffect(() => load(), [load]);

  useEffect(() => setOpenId(focusThreadId ?? null), [focusThreadId]);

  // Opening a conversation is what marks it read; the badge should not clear from the list alone.
  useEffect(() => {
    if (!accessToken || !openThread || openThread.unread === 0) {
      return;
    }

    markThreadRead(accessToken, openThread.id, isStaff)
      .then((updated) => {
        setThreads((current) => {
          const next = current.map((thread) => (thread.id === updated.id ? updated : thread));
          onUnreadChange(next.reduce((total, thread) => total + thread.unread, 0));
          return next;
        });
      })
      .catch(() => {
        // A badge that clears late is not worth an error in front of the user.
      });
  }, [accessToken, isStaff, onUnreadChange, openThread]);

  // Conversations read bottom-up, so a newly opened thread starts at the latest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [openThread?.messages.length, openId]);

  const send = () => {
    const text = draft.trim();
    if (!accessToken || !openThread || !text || isSending) {
      return;
    }

    setIsSending(true);
    const role: ChatSenderRole = isStaff ? "admin" : (user.role as ChatSenderRole);
    sendThreadMessage(accessToken, openThread.id, text, { name: user.name, role }, isStaff)
      .then((updated) => {
        setThreads((current) => current.map((thread) => (thread.id === updated.id ? updated : thread)));
        setDraft("");
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not send that message.");
      })
      .finally(() => setIsSending(false));
  };

  const sorted = useMemo(
    () => [...threads].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()),
    [threads],
  );

  return (
    <div className="messenger-panel" role="dialog" aria-label={t("Messages")}>
      <header className="messenger-head">
        {openThread ? (
          <button aria-label={t("Back")} className="messenger-back" type="button" onClick={() => setOpenId(null)}>
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        ) : null}
        <div>
          <strong>{openThread ? openThread.participantName : t("Messages")}</strong>
          <small>{openThread ? openThread.subject : t("Conversations with AmarKrishok support")}</small>
        </div>
        <button aria-label={t("Close")} className="messenger-close" type="button" onClick={onClose}>
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      {error ? <p className="messenger-error">{t(error)}</p> : null}
      {isLoading ? <ListLoading label={t("Loading messages...")} /> : null}

      {!isLoading && !openThread ? (
        <div className="messenger-list">
          {sorted.length === 0 ? (
            <p className="messenger-empty">
              {isStaff ? t("No conversations yet.") : t("No messages yet. Support will reply here.")}
            </p>
          ) : (
            sorted.map((thread) => (
              <button className="messenger-row" key={thread.id} type="button" onClick={() => setOpenId(thread.id)}>
                <span className="messenger-avatar" aria-hidden="true">
                  {initials(isStaff ? thread.participantName : "AmarKrishok")}
                </span>
                <span className="messenger-row-body">
                  <strong>{isStaff ? thread.participantName : t("AmarKrishok support")}</strong>
                  <small>{thread.messages[thread.messages.length - 1]?.text ?? thread.subject}</small>
                </span>
                <span className="messenger-row-meta">
                  <em>{timeLabel(thread.updatedAt, locale)}</em>
                  {thread.unread > 0 ? <i className="messenger-unread">{thread.unread}</i> : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {openThread ? (
        <>
          <div className="messenger-thread" ref={scrollRef}>
            {openThread.messages.map((message) => {
              // "Mine" is whichever side the viewer is on, so the layout reads the same for both.
              const fromStaff = message.senderRole === "admin";
              const mine = isStaff ? fromStaff : !fromStaff;
              return (
                <div className={mine ? "messenger-bubble mine" : "messenger-bubble"} key={message.id}>
                  <span>{message.text}</span>
                  <em>{timeLabel(message.createdAt, locale)}</em>
                </div>
              );
            })}
          </div>
          <form
            className="messenger-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              aria-label={t("Write a message")}
              disabled={isSending}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={isStaff ? t("Reply as AmarKrishok support") : t("Write a message")}
              value={draft}
            />
            <button aria-label={t("Send")} disabled={isSending || !draft.trim()} type="submit">
              <Send aria-hidden="true" size={16} />
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
