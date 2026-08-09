import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { api } from "../api/runtime";
import { ApiError } from "../api/errors";
import { previewUsers } from "../data/demo";
import type { AppRole, AppUser } from "../domain/types";
import { sessionStore } from "./sessionStore";
import { getDeviceRegistration } from "../notifications/push";

const ACCESS_TOKEN_KEY = "amarkrishok.accessToken";
const REFRESH_TOKEN_KEY = "amarkrishok.refreshToken";
const USER_KEY = "amarkrishok.user";

type AuthResult = { accessToken: string; refreshToken?: string; user: AppUser };

type SessionContextValue = {
  isLoading: boolean;
  logout: () => Promise<void>;
  requestOtp: (phone: string, role: AppRole) => Promise<void>;
  signInWithOtp: (phone: string, role: AppRole, otp: string, pin: string) => Promise<void>;
  user: AppUser | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function isAppUser(value: unknown): value is AppUser {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.role === "string" && ["FARMER", "BUYER", "CARRIER"].includes(record.role);
}

async function persistSession(result: AuthResult) {
  sessionStore.setAccessToken(result.accessToken);
  if (result.refreshToken) sessionStore.setRefreshToken(result.refreshToken);
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, result.accessToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user)),
    result.refreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken) : Promise.resolve(),
  ]);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    void Promise.all([SecureStore.getItemAsync(ACCESS_TOKEN_KEY), SecureStore.getItemAsync(USER_KEY), SecureStore.getItemAsync(REFRESH_TOKEN_KEY)])
      .then(([token, storedUser, refreshToken]) => {
        if (!token || !storedUser) return;
        const parsed: unknown = JSON.parse(storedUser);
        if (!isAppUser(parsed)) return;
        sessionStore.setAccessToken(token);
        if (refreshToken) sessionStore.setRefreshToken(refreshToken);
        setUser(parsed);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const requestOtp = useCallback(async (phone: string, role: AppRole) => {
    try {
      await api.request("/auth/otp/request", { auth: false, body: { phone, role }, method: "POST" });
    } catch (error) {
      if (!__DEV__ || error instanceof ApiError) throw error;
    }
  }, []);

  const signInWithOtp = useCallback(async (phone: string, role: AppRole, otp: string, pin: string) => {
    let result: AuthResult;
    try {
      const device = await getDeviceRegistration();
      result = await api.request<AuthResult>("/auth/otp/verify", {
        auth: false,
        body: { ...device, otp, phone, pin, role },
        method: "POST",
      });
    } catch (error) {
      if (!__DEV__ || otp !== "1234" || error instanceof ApiError) throw error;
      result = { accessToken: `preview.${role.toLowerCase()}.token`, user: { ...previewUsers[role], phone } };
    }

    await persistSession(result);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } catch {
      // Local credentials must still be cleared if the server is offline.
    }
    sessionStore.clear();
    setUser(null);
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  }, []);

  const value = useMemo(() => ({ isLoading, logout, requestOtp, signInWithOtp, user }), [isLoading, logout, requestOtp, signInWithOtp, user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider.");
  return value;
}
