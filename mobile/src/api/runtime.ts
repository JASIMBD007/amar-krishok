import { sessionStore } from "../auth/sessionStore";
import { ApiClient } from "./client";
import { resolveApiBaseUrl } from "./config";

export const apiBaseUrl = resolveApiBaseUrl();

export const api = new ApiClient({ baseUrl: apiBaseUrl, session: sessionStore });

export function absoluteApiUrl(path: string) {
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
