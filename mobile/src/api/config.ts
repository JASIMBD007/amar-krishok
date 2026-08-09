export const defaultApiBaseUrl = "https://amar-krishok-api.onrender.com/api/v1";

export function resolveApiBaseUrl(value = process.env.EXPO_PUBLIC_API_BASE_URL) {
  const candidate = (value?.trim() || defaultApiBaseUrl).replace(/\/+$/, "");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.");
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
  }

  if (!url.pathname.endsWith("/api/v1")) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must include the /api/v1 prefix.");
  }

  return url.toString().replace(/\/$/, "");
}
