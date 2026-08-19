import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { LifeBuoy, MessageSquare, Send } from "lucide-react";
import { ApiRequestError } from "../../api/auth";
import {
  fetchMyThreads,
  markThreadRead,
  openThread as openNewThread,
  sendThreadMessage,
  type MessageThread,
} from "../../api/chat";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import type { AuthUser, ChatSenderRole } from "../../types";
import { EmptyState, ListLoading } from "../EmptyState";

/**
 * Conversations: `/messages`.
 *
 * Two panes — the thread list and the open conversation — the same shape the staff support inbox
 * uses, with buyer/farmer framing. Staff see every thread and reply as support; a farmer or buyer
 * sees only their own. One component serves both, because the only real difference is whose messages
 * sit on the right.
 */

/** Staff arriving from a user record who has no thread yet, carried in the query string. */
const NEW_THREAD = "__new__";

function initialsOf(name: string) {
  return name
    .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .slice(0, 2)
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

function roleLabel(thread: MessageThread, t: (text: string) => string) {
  if (thread.participantRole === "guest") {
    return t("Guest");
  }

  return t(thread.participantRole === "buyer" ? "Buyer" : "Farmer");
}

export function MessagesPage({ user }: { user: AuthUser | null }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [search, setSearch] = useSearchParams();

  const isStaff = user?.role === "admin";
  const accessToken = user?.accessToken;
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Staff can arrive from a user record: ?name=&phone=&role= opens or starts that conversation.
  const composeWith = useMemo(() => {
    const phone = search.get("phone");
    const name = search.get("name");
    const role = search.get("role");
    if (!phone || !name || (role !== "buyer" && role !== "farmer")) {
      return null;
    }

    return { id: search.get("id") ?? undefined, name, phone, role: role as "buyer" | "farmer" };
  }, [search]);

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetchMyThreads(accessToken, Boolean(isStaff))
      .then((result) => {
        setThreads(result);
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load messages.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, isStaff]);

  useEffect(() => load(), [load]);

  const sorted = useMemo(
    () => [...threads].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()),
    [threads],
  );

  // Land somewhere sensible: the thread asked for, the counterpart's existing one, or the newest.
  useEffect(() => {
    if (openId) {
      return;
    }

    const wanted = search.get("thread");
    if (wanted && threads.some((thread) => thread.id === wanted)) {
      setOpenId(wanted);
      return;
    }

    if (composeWith) {
      // One conversation per person: reuse theirs rather than starting a second.
      const existing = threads.find((thread) => thread.participantPhone === composeWith.phone);
      setOpenId(existing ? existing.id : NEW_THREAD);
      return;
    }

    if (sorted.length > 0) {
      setOpenId(sorted[0].id);
    }
  }, [composeWith, openId, search, sorted, threads]);

  const openThread = threads.find((thread) => thread.id === openId) ?? null;
  const composing = openId === NEW_THREAD && Boolean(composeWith);

  // Opening a conversation is what marks it read, not merely having it in the list.
  useEffect(() => {
    if (!accessToken || !openThread || openThread.unread === 0) {
      return;
    }

    markThreadRead(accessToken, openThread.id, Boolean(isStaff))
      .then((updated) => {
        setThreads((current) => current.map((thread) => (thread.id === updated.id ? updated : thread)));
      })
      .catch(() => {
        // A badge that clears late is not worth an error in front of the user.
      });
  }, [accessToken, isStaff, openThread]);

  // Conversations read bottom-up, so an opened thread starts at the latest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [openThread?.messages.length, openId]);

  const pick = (threadId: string) => {
    setOpenId(threadId);
    setNotice("");
    // Drop the compose parameters once a real thread is chosen, so a refresh does not reopen them.
    if (search.get("phone") || search.get("thread")) {
      setSearch({}, { replace: true });
    }
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!accessToken || !user || !text || isSending || (!openThread && !composing)) {
      return;
    }

    setIsSending(true);
    const role: ChatSenderRole = isStaff ? "admin" : (user.role as ChatSenderRole);
    const request =
      composing && composeWith
        ? openNewThread(
            accessToken,
            {
              participantId: composeWith.id,
              participantName: composeWith.name,
              participantPhone: composeWith.phone,
              participantRole: composeWith.role,
              subject: "Message from AmarKrishok support",
              text,
            },
            Boolean(isStaff),
          )
        : sendThreadMessage(accessToken, openThread!.id, text, { name: user.name, role }, Boolean(isStaff));

    request
      .then((updated) => {
        setThreads((current) =>
          current.some((thread) => thread.id === updated.id)
            ? current.map((thread) => (thread.id === updated.id ? updated : thread))
            : [updated, ...current],
        );
        setOpenId(updated.id);
        setDraft("");
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not send that message.");
      })
      .finally(() => setIsSending(false));
  };

  /**
   * Escalating hands the thread to staff. The server owns that state, and there is no endpoint for
   * it yet, so this posts a message naming the order rather than pretending the status changed.
   */
  const escalate = () => {
    if (!accessToken || !user || !openThread || isSending) {
      return;
    }

    setIsSending(true);
    const role: ChatSenderRole = isStaff ? "admin" : (user.role as ChatSenderRole);
    sendThreadMessage(
      accessToken,
      openThread.id,
      `${t("Asking AmarKrishok staff to look at this conversation.")} ${openThread.subject}`,
      { name: user.name, role },
      Boolean(isStaff),
    )
      .then((updated) => {
        setThreads((current) => current.map((thread) => (thread.id === updated.id ? updated : thread)));
        setNotice("Staff can read this thread now. Support replies here.");
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not escalate this conversation.");
      })
      .finally(() => setIsSending(false));
  };

  const headerName = composing && composeWith ? composeWith.name : openThread?.participantName ?? "";

  return (
    <section className="page-wrap messages-page">
      <div className="messages-head">
        <h1>{t("Messages")}</h1>
        <span>
          {t("Talk to the other side of a deal — or to AmarKrishok staff. Staff can read a thread once it is escalated.")}
        </span>
      </div>

      {error ? <p className="marketplace-feedback warning">{t(error)}</p> : null}
      {isLoading ? <ListLoading label={t("Loading messages...")} /> : null}

      {!isLoading && sorted.length === 0 && !composing ? (
        <EmptyState
          icon={MessageSquare}
          title={t("No conversations yet")}
          hint={t("When you order a lot or answer an offer, the conversation with the other side starts here.")}
        />
      ) : null}

      {sorted.length > 0 || composing ? (
        <div className="messages-layout">
          <aside className="messages-threads" aria-label={t("Conversations")}>
            {composing && composeWith ? (
              <button className="messages-thread on" type="button">
                <span className="messages-thread-avatar">{initialsOf(composeWith.name)}</span>
                <span className="messages-thread-copy">
                  <strong>{composeWith.name}</strong>
                  <small>{t(composeWith.role === "buyer" ? "Buyer" : "Farmer")}</small>
                  <small>{t("New conversation")}</small>
                </span>
              </button>
            ) : null}

            {sorted.map((thread) => (
              <button
                aria-current={thread.id === openId ? "true" : undefined}
                className={thread.id === openId ? "messages-thread on" : "messages-thread"}
                key={thread.id}
                type="button"
                onClick={() => pick(thread.id)}
              >
                <span className="messages-thread-avatar">{initialsOf(thread.participantName)}</span>
                <span className="messages-thread-copy">
                  <span className="messages-thread-name">
                    <strong>{thread.participantName}</strong>
                    {thread.unread > 0 ? <em className="mono-figure">{v(thread.unread)}</em> : null}
                  </span>
                  <small>{roleLabel(thread, t)}</small>
                  <small className="messages-thread-preview">
                    {thread.messages.at(-1)?.text ?? t("No messages yet")}
                  </small>
                </span>
                <small className="messages-thread-at">{v(timeLabel(thread.updatedAt, language))}</small>
              </button>
            ))}
          </aside>

          <div className="messages-conversation">
            <header>
              <span className="messages-thread-avatar">{initialsOf(headerName)}</span>
              <span className="messages-conversation-copy">
                <strong>{headerName}</strong>
                <small>
                  {openThread ? roleLabel(openThread, t) : t(composeWith?.role === "buyer" ? "Buyer" : "Farmer")}
                  {openThread?.subject ? ` · ${t(openThread.subject)}` : ""}
                </small>
              </span>
              {openThread && !isStaff ? (
                <button className="secondary-button" disabled={isSending} type="button" onClick={escalate}>
                  <LifeBuoy aria-hidden="true" size={15} />
                  {t("Escalate to staff")}
                </button>
              ) : null}
            </header>

            {notice ? (
              <p className="soft-notice" role="status">
                {t(notice)}
              </p>
            ) : null}

            <div className="messages-stream" ref={scrollRef}>
              {(openThread?.messages ?? []).map((message) => {
                // Your own side sits on the right. For staff that is every support message.
                const mine = isStaff ? message.senderRole === "admin" : message.senderRole !== "admin";
                return (
                  <div className={mine ? "messages-bubble-row mine" : "messages-bubble-row"} key={message.id}>
                    <span className="messages-bubble">{message.text}</span>
                    <small>{v(timeLabel(message.createdAt, language))}</small>
                  </div>
                );
              })}
              {composing ? <p className="panel-note">{t("Write the first message to start this conversation.")}</p> : null}
            </div>

            <form className="messages-composer" onSubmit={send}>
              <input
                aria-label={t("Write a message")}
                placeholder={t("Write a message")}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="primary-button" disabled={isSending || !draft.trim()} type="submit">
                <Send aria-hidden="true" size={16} />
                {t(isSending ? "Sending" : "Send")}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
