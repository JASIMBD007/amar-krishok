import { DEFAULT_LOCALE, normalizeLocale } from "../i18n/config";

const productionApiBaseUrl = (import.meta.env.VITE_PRODUCTION_API_BASE_URL || "https://amar-krishok-api.onrender.com").replace(/\/$/, "");
const localApiBaseUrl = "http://localhost:4000";
const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const environment = Object.freeze({
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || (isLocalFrontend ? localApiBaseUrl : productionApiBaseUrl)).replace(/\/$/, ""),
  defaultLocale: normalizeLocale(import.meta.env.VITE_DEFAULT_LOCALE || DEFAULT_LOCALE),
  isLocalFrontend,
  productionApiBaseUrl,
  timeZone: import.meta.env.VITE_TIME_ZONE || "Asia/Dhaka",
});
