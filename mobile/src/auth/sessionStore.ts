export type SessionListener = (accessToken: string | null) => void;

export interface SessionStore {
  clear(): void;
  getAccessToken(): string | null;
  setAccessToken(accessToken: string): void;
  subscribe(listener: SessionListener): () => void;
}

export function createMemorySessionStore(initialAccessToken: string | null = null): SessionStore {
  let accessToken = initialAccessToken;
  const listeners = new Set<SessionListener>();

  const publish = () => {
    listeners.forEach((listener) => listener(accessToken));
  };

  return {
    clear() {
      accessToken = null;
      publish();
    },
    getAccessToken() {
      return accessToken;
    },
    setAccessToken(nextAccessToken) {
      accessToken = nextAccessToken;
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const sessionStore = createMemorySessionStore();
