import { ApiError } from "./errors";
import { apiBaseUrl } from "./runtime";

const websiteApiBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

function bengaliMessage(message: string) {
  if (message === "Account is waiting for admin verification.") return "অ্যাকাউন্টটি এখনো অ্যাডমিন যাচাইয়ের অপেক্ষায় আছে।";
  if (message.includes("Invalid mobile number or password")) return "মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।";
  if (message.includes("already exists")) return "এই মোবাইল নম্বর দিয়ে এই ধরনের অ্যাকাউন্ট ইতিমধ্যে আছে।";
  return "অনুরোধটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।";
}

export async function websiteAuthRequest<T>(path: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(`${websiteApiBaseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    throw new ApiError(0, { code: "NETWORK_UNAVAILABLE", message: "The authentication service is unavailable.", messageBn: "লগইন সার্ভারে সংযোগ করা যায়নি।" });
  }

  const payload = await response.json().catch(() => undefined) as { error?: { code?: string; message?: string; messageBn?: string }; message?: string | string[] } | undefined;
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    throw new ApiError(response.status, {
      code: payload?.error?.code ?? `HTTP_${response.status}`,
      message: payload?.error?.message ?? message ?? "Authentication failed.",
      messageBn: payload?.error?.messageBn ?? bengaliMessage(message ?? ""),
    });
  }
  return payload as T;
}
