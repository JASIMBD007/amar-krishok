import type { SessionStore } from "../auth/sessionStore";
import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiErrorPayload,
  ApiMeta,
  ApiRequestOptions,
  RefreshData,
} from "./contracts";
import { ApiError } from "./errors";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientConfig = {
  baseUrl: string;
  fetch?: FetchLike;
  session: SessionStore;
};

const fallbackError = (status: number): ApiErrorPayload => ({
  code: `HTTP_${status}`,
  message: "The request could not be completed.",
  messageBn: "অনুরোধটি সম্পন্ন করা যায়নি।",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    typeof value.error.messageBn === "string"
  );
}

function isRefreshData(value: unknown): value is RefreshData {
  return isRecord(value) && typeof value.accessToken === "string" && value.accessToken.length > 0;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return undefined;

  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function toApiError(response: Response) {
  const body = await readJson(response);
  return new ApiError(
    response.status,
    isApiErrorEnvelope(body) ? body.error : fallbackError(response.status),
  );
}

function joinUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private refreshPromise: Promise<string> | null = null;
  private readonly session: SessionStore;

  constructor({ baseUrl, fetch: fetchOverride, session }: ApiClientConfig) {
    if (!baseUrl.trim()) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL is required.");
    }

    this.baseUrl = baseUrl;
    this.fetcher = fetchOverride ?? globalThis.fetch;
    this.session = session;
  }

  async request<TData, TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<TData> {
    const envelope = await this.requestEnvelope<TData, ApiMeta, TBody>(path, options);
    return envelope.data;
  }

  async requestEnvelope<
    TData,
    TMeta extends ApiMeta = ApiMeta,
    TBody = unknown,
  >(
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<ApiEnvelope<TData, TMeta>> {
    const response = await this.send(path, options, this.session.getAccessToken());
    const authEnabled = options.auth !== false;

    if (response.status === 401 && authEnabled) {
      const accessToken = await this.refreshAccessToken();
      const retryResponse = await this.send(path, options, accessToken);
      return this.readEnvelope<TData, TMeta>(retryResponse);
    }

    return this.readEnvelope<TData, TMeta>(response);
  }

  private async readEnvelope<TData, TMeta extends ApiMeta>(
    response: Response,
  ): Promise<ApiEnvelope<TData, TMeta>> {
    if (!response.ok) throw await toApiError(response);

    const body = await readJson(response);
    if (!isRecord(body) || !("data" in body)) {
      throw new ApiError(response.status, {
        code: "INVALID_RESPONSE_ENVELOPE",
        message: "The server response did not match the API contract.",
        messageBn: "সার্ভারের উত্তর API চুক্তির সাথে মেলেনি।",
      });
    }

    return body as ApiEnvelope<TData, TMeta>;
  }

  private async refreshAccessToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async performRefresh() {
    const refreshToken = this.session.getRefreshToken();
    const response = await this.fetcher(joinUrl(this.baseUrl, "/auth/refresh"), {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      ...(refreshToken ? { body: JSON.stringify({ refreshToken }) } : {}),
    });

    if (!response.ok) {
      this.session.clear();
      throw await toApiError(response);
    }

    const envelope = await this.readEnvelope<unknown, ApiMeta>(response);
    if (!isRefreshData(envelope.data)) {
      this.session.clear();
      throw new ApiError(response.status, {
        code: "INVALID_REFRESH_RESPONSE",
        message: "The refresh response did not include an access token.",
        messageBn: "রিফ্রেশ উত্তরে অ্যাক্সেস টোকেন পাওয়া যায়নি।",
      });
    }

    this.session.setAccessToken(envelope.data.accessToken);
    if (envelope.data.refreshToken) this.session.setRefreshToken(envelope.data.refreshToken);
    return envelope.data.accessToken;
  }

  private send<TBody>(
    path: string,
    options: ApiRequestOptions<TBody>,
    accessToken: string | null,
  ) {
    const { auth = true, body, headers: inputHeaders, idempotencyKey, ...requestInit } = options;
    const headers = new Headers(inputHeaders);
    headers.set("Accept", "application/json");

    if (auth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
      if (isFormData(body)) {
        requestBody = body;
      } else {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(body);
      }
    }

    const init: RequestInit = {
      ...requestInit,
      credentials: "include",
      headers,
      ...(requestBody === undefined ? {} : { body: requestBody }),
    };

    return this.fetcher(joinUrl(this.baseUrl, path), init);
  }
}
