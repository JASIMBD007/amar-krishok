import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { api } from "../api/runtime";
import { websiteAuthRequest } from "../api/webAuth";
import type { AppRole, AppUser } from "../domain/types";
import { sessionStore } from "./sessionStore";
import { getDeviceRegistration } from "../notifications/push";

const ACCESS_TOKEN_KEY = "amarkrishok.accessToken";
const REFRESH_TOKEN_KEY = "amarkrishok.refreshToken";
const USER_KEY = "amarkrishok.user";

type AuthResult = { accessToken: string; refreshToken?: string; user: AppUser };
export type RegistrationInput = {
  address: string;
  district: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  role: Exclude<AppRole, "CARRIER">;
  upazila: string;
};

type SessionContextValue = {
  isLoading: boolean;
  login: (phone: string, password: string, role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
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

function websitePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return `0${local}`;
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

  const login = useCallback(async (phone: string, password: string, role: AppRole) => {
    const device = await getDeviceRegistration();
    const result = role === "CARRIER"
      ? await api.request<AuthResult>("/auth/login", { auth: false, body: { ...device, password, phone, role }, method: "POST" })
      : await websiteAuthRequest<AuthResult>("/api/auth/login", { ...device, client: "mobile", password, phone: websitePhone(phone), role });
    await persistSession(result);
    setUser(result.user);
  }, []);

  const register = useCallback(async (input: RegistrationInput) => {
    const rolePath = input.role === "BUYER" ? "buyer" : "farmer";
    await websiteAuthRequest(`/api/auth/register/${rolePath}`, {
      address: input.address,
      district: input.district,
      focus: input.focus,
      identity: input.identity,
      name: input.name,
      organization: input.organization,
      password: input.password,
      phone: websitePhone(input.phone),
      role: input.role,
      upazilla: input.upazila,
    });
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

  const refreshUser = useCallback(async () => {
    const refreshed = await api.request<AppUser>("/me");
    setUser(refreshed);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(refreshed));
  }, []);

  const value = useMemo(() => ({ isLoading, login, logout, refreshUser, register, user }), [isLoading, login, logout, refreshUser, register, user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider.");
  return value;
}
