export type SessionListener = (accessToken: string | null) => void;

export interface SessionStore {
  clear(): void;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setAccessToken(accessToken: string): void;
  setRefreshToken(refreshToken: string): void;
  subscribe(listener: SessionListener): () => void;
}

export function createMemorySessionStore(initialAccessToken: string | null = null, initialRefreshToken: string | null = null): SessionStore {
  let accessToken = initialAccessToken;
  let refreshToken = initialRefreshToken;
  const listeners = new Set<SessionListener>();

  const publish = () => {
    listeners.forEach((listener) => listener(accessToken));
  };

  return {
    clear() {
      accessToken = null;
      refreshToken = null;
      publish();
    },
    getAccessToken() {
      return accessToken;
    },
    getRefreshToken() {
      return refreshToken;
    },
    setAccessToken(nextAccessToken) {
      accessToken = nextAccessToken;
      publish();
    },
    setRefreshToken(nextRefreshToken) {
      refreshToken = nextRefreshToken;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const sessionStore = createMemorySessionStore();
