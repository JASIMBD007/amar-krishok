import { sessionStore } from "../auth/sessionStore";
import { ApiClient } from "./client";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const apiClient = apiBaseUrl
  ? new ApiClient({ baseUrl: apiBaseUrl, session: sessionStore })
  : null;

export { ApiClient } from "./client";
export { ApiError } from "./errors";
export type {
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiErrorPayload,
  ApiMeta,
  ApiRequestOptions,
} from "./contracts";
