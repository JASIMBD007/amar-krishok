import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultChatThreads } from "../data";
import type {
  AccountStatus,
  AuthUser,
  ChatMessage,
  ChatParticipant,
  ChatParticipantRole,
  ChatThread,
  Language,
  RegisteredAccount,
} from "../types";

const AUTH_STORAGE_KEY = "amarKrishokAuth";
const REGISTRATION_STORAGE_KEY = "amarKrishokRegistrations";
const CHAT_STORAGE_KEY = "amarKrishokChatThreads";
const STORE_STORAGE_KEY = "amarKrishokAppState";

function hasRole(role: unknown): role is AuthUser["role"] {
  return role === "admin" || role === "buyer" || role === "farmer";
}

function hasRegistrationRole(role: unknown): role is RegisteredAccount["role"] {
  return role === "buyer" || role === "farmer";
}

function hasChatParticipantRole(role: unknown): role is ChatParticipantRole {
  return role === "buyer" || role === "farmer" || role === "guest";
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readStoredUser() {
  try {
    const savedUser = readLocalStorage(AUTH_STORAGE_KEY);
    if (!savedUser) {
      return null;
    }

    const user = JSON.parse(savedUser) as AuthUser;
    return hasRole(user.role) ? user : null;
  } catch {
    return null;
  }
}

function readStoredRegistrations() {
  try {
    const savedRegistrations = readLocalStorage(REGISTRATION_STORAGE_KEY);
    if (!savedRegistrations) {
      return [];
    }

    const registrations = JSON.parse(savedRegistrations) as RegisteredAccount[];
    return registrations.filter((account) => hasRegistrationRole(account.role));
  } catch {
    return [];
  }
}

function readStoredChatThreads() {
  try {
    const savedThreads = readLocalStorage(CHAT_STORAGE_KEY);
    if (!savedThreads) {
      return defaultChatThreads;
    }

    const threads = JSON.parse(savedThreads) as ChatThread[];
    return threads.filter((thread) => hasChatParticipantRole(thread.participantRole));
  } catch {
    return defaultChatThreads;
  }
}

function makeChatMessageId() {
  return `CHAT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function makeParticipantChatThreadId(participant: ChatParticipant) {
  const cleanPhone = participant.phone.replace(/\D/g, "") || "unknown";
  return `${participant.role}-${participant.id || cleanPhone}`;
}

function appendParticipantMessage(chatThreads: ChatThread[], participant: ChatParticipant, text: string, subject: string) {
  const timestamp = new Date().toISOString();
  const threadId = makeParticipantChatThreadId(participant);
  const nextMessage: ChatMessage = {
    id: makeChatMessageId(),
    createdAt: timestamp,
    senderName: participant.name,
    senderRole: participant.role,
    text,
  };
  const existingThread = chatThreads.find((thread) => thread.id === threadId);

  if (!existingThread) {
    return [
      {
        id: threadId,
        messages: [nextMessage],
        participantId: participant.id,
        participantName: participant.name,
        participantPhone: participant.phone,
        participantRole: participant.role,
        status: "waiting" as const,
        subject,
        updatedAt: timestamp,
      },
      ...chatThreads,
    ];
  }

  return chatThreads.map((thread) =>
    thread.id === threadId
      ? {
          ...thread,
          messages: [...thread.messages, nextMessage],
          participantId: participant.id,
          participantName: participant.name,
          participantPhone: participant.phone,
          status: "waiting" as const,
          subject: thread.subject || subject,
          updatedAt: timestamp,
        }
      : thread,
  );
}

type AppStore = {
  chatThreads: ChatThread[];
  district: string;
  language: Language;
  loginOpen: boolean;
  menuOpen: boolean;
  query: string;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
  addRegistration: (account: RegisteredAccount) => void;
  closeHeaderMenus: () => void;
  markChatThreadOpen: (threadId: string) => void;
  sendAdminChatReply: (threadId: string, text: string) => void;
  sendParticipantChatMessage: (participant: ChatParticipant, text: string, subject: string) => void;
  sendUserChatMessage: (sender: AuthUser, text: string, subject: string) => void;
  setDistrict: (district: string) => void;
  setLanguage: (language: Language) => void;
  setLoginOpen: (loginOpen: boolean) => void;
  setMenuOpen: (menuOpen: boolean) => void;
  setQuery: (query: string) => void;
  setUser: (user: AuthUser | null) => void;
  toggleLoginOpen: () => void;
  toggleMenuOpen: () => void;
  updateRegistrationStatus: (id: string, status: AccountStatus) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      chatThreads: readStoredChatThreads(),
      district: "All districts",
      language: "en",
      loginOpen: false,
      menuOpen: false,
      query: "",
      registrations: readStoredRegistrations(),
      user: readStoredUser(),
      addRegistration: (account) =>
        set((state) => {
          const exists = state.registrations.some((item) => item.id === account.id);

          return {
            registrations: exists
              ? state.registrations.map((item) => (item.id === account.id ? account : item))
              : [account, ...state.registrations],
          };
        }),
      closeHeaderMenus: () => set({ loginOpen: false, menuOpen: false }),
      markChatThreadOpen: (threadId) =>
        set((state) => ({
          chatThreads: state.chatThreads.map((thread) =>
            thread.id === threadId && thread.status === "waiting" ? { ...thread, status: "open" } : thread,
          ),
        })),
      sendAdminChatReply: (threadId, text) => {
        const timestamp = new Date().toISOString();
        const nextMessage: ChatMessage = {
          id: makeChatMessageId(),
          createdAt: timestamp,
          senderName: "Admin",
          senderRole: "admin",
          text,
        };

        set((state) => ({
          chatThreads: state.chatThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: [...thread.messages, nextMessage],
                  status: "open",
                  updatedAt: timestamp,
                }
              : thread,
          ),
        }));
      },
      sendParticipantChatMessage: (participant, text, subject) => {
        set((state) => ({ chatThreads: appendParticipantMessage(state.chatThreads, participant, text, subject) }));
      },
      sendUserChatMessage: (sender, text, subject) => {
        if (sender.role === "admin") {
          return;
        }

        const participantRole: ChatParticipantRole = sender.role;
        const participant: ChatParticipant = {
          id: sender.accountId ?? (sender.phone.replace(/\D/g, "") || "unknown"),
          name: sender.name,
          phone: sender.phone,
          role: participantRole,
        };
        set((state) => ({ chatThreads: appendParticipantMessage(state.chatThreads, participant, text, subject) }));
      },
      setDistrict: (district) => set({ district }),
      setLanguage: (language) => set({ language }),
      setLoginOpen: (loginOpen) => set({ loginOpen }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setQuery: (query) => set({ query }),
      setUser: (user) => set({ user }),
      toggleLoginOpen: () => set((state) => ({ loginOpen: !state.loginOpen })),
      toggleMenuOpen: () => set((state) => ({ menuOpen: !state.menuOpen })),
      updateRegistrationStatus: (id, status) =>
        set((state) => ({
          registrations: state.registrations.map((account) =>
            account.id === id ? { ...account, status, reviewedAt: new Date().toISOString() } : account,
          ),
        })),
    }),
    {
      name: STORE_STORAGE_KEY,
      partialize: (state) => ({
        chatThreads: state.chatThreads,
        language: state.language,
        registrations: state.registrations,
        user: state.user,
      }),
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
