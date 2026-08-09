import { describe, expect, it, vi } from "vitest";

import { createMemorySessionStore } from "../auth/sessionStore";
import { ApiClient, type FetchLike } from "./client";
import { ApiError } from "./errors";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("ApiClient", () => {
  it("refreshes once and retries concurrent 401 responses with the new token", async () => {
    const session = createMemorySessionStore("expired-token", "old-refresh-token");
    let refreshCalls = 0;
    const fetcher = vi.fn<FetchLike>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await Promise.resolve();
        expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: "old-refresh-token" });
        return jsonResponse({
          data: { accessToken: "fresh-token", refreshToken: "rotated-refresh-token" },
        });
      }

      const authorization = new Headers(init?.headers).get("Authorization");
      if (authorization === "Bearer fresh-token") {
        return jsonResponse({ data: { ok: true } });
      }
      return jsonResponse(
        {
          error: {
            code: "ACCESS_TOKEN_EXPIRED",
            message: "Access token expired.",
            messageBn: "অ্যাক্সেস টোকেনের মেয়াদ শেষ।",
          },
        },
        401,
      );
    });
    const client = new ApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetcher,
      session,
    });

    const [first, second] = await Promise.all([
      client.request<{ ok: boolean }>("/me"),
      client.request<{ ok: boolean }>("/me/notification-prefs"),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(session.getAccessToken()).toBe("fresh-token");
    expect(session.getRefreshToken()).toBe("rotated-refresh-token");
  });

  it("preserves the bilingual API error envelope", async () => {
    const fetcher = vi.fn<FetchLike>(async () =>
      jsonResponse(
        {
          error: {
            code: "FORBIDDEN_ROLE",
            message: "This role cannot access the resource.",
            messageBn: "এই ভূমিকা রিসোর্সটি ব্যবহার করতে পারবে না।",
          },
        },
        403,
      ),
    );
    const client = new ApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetcher,
      session: createMemorySessionStore(),
    });

    await expect(client.request("/carrier/trips", { auth: false })).rejects.toMatchObject({
      code: "FORBIDDEN_ROLE",
      messageBn: "এই ভূমিকা রিসোর্সটি ব্যবহার করতে পারবে না।",
      status: 403,
    } satisfies Partial<ApiError>);
  });

  it("forwards caller-owned idempotency keys", async () => {
    const fetcher = vi.fn<FetchLike>(async (_input, init) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("logout-attempt-1");
      return jsonResponse({ data: { accepted: true } });
    });
    const client = new ApiClient({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetcher,
      session: createMemorySessionStore("token"),
    });

    await expect(
      client.request("/auth/logout", {
        idempotencyKey: "logout-attempt-1",
        method: "POST",
      }),
    ).resolves.toEqual({ accepted: true });
  });
});
