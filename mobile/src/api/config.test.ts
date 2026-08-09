import { describe, expect, it } from "vitest";

import { defaultApiBaseUrl, resolveApiBaseUrl } from "./config";

describe("mobile API configuration", () => {
  it("uses the physical-device-safe deployed API when no override is supplied", () => {
    expect(resolveApiBaseUrl("")).toBe(defaultApiBaseUrl);
  });

  it("normalizes a configured versioned API URL", () => {
    expect(resolveApiBaseUrl(" http://192.168.1.20:4000/api/v1/ ")).toBe(
      "http://192.168.1.20:4000/api/v1",
    );
  });

  it("rejects non-HTTP and unversioned API URLs", () => {
    expect(() => resolveApiBaseUrl("file:///api/v1")).toThrow("HTTP or HTTPS");
    expect(() => resolveApiBaseUrl("https://api.example.com")).toThrow("/api/v1");
  });
});
