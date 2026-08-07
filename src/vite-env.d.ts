/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEFAULT_LOCALE?: "bn-BD" | "en";
  readonly VITE_PRODUCTION_API_BASE_URL?: string;
  readonly VITE_TIME_ZONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
