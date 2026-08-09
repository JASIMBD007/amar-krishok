import { sessionStore } from "../auth/sessionStore";
import { ApiClient } from "./client";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

export const api = new ApiClient({ baseUrl, session: sessionStore });
