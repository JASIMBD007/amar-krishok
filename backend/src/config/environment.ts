type Environment = Record<string, unknown>;

const SUPPORTED_LOCALES = new Set(["bn-BD", "en"]);
const DISPLAY_TIME_ZONE = "Asia/Dhaka";

function requirePostgresUrl(value: unknown) {
  if (typeof value !== "string" || !/^postgres(?:ql)?:\/\//.test(value)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }

  return value;
}

function parsePort(value: unknown) {
  const port = Number(value ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function validateEnvironment(input: Environment): Environment {
  const locale = typeof input.DEFAULT_LOCALE === "string" ? input.DEFAULT_LOCALE : "bn-BD";
  if (!SUPPORTED_LOCALES.has(locale)) {
    throw new Error("DEFAULT_LOCALE must be bn-BD or en.");
  }

  const timeZone = typeof input.DISPLAY_TIME_ZONE === "string" ? input.DISPLAY_TIME_ZONE : DISPLAY_TIME_ZONE;
  if (timeZone !== DISPLAY_TIME_ZONE) {
    throw new Error("DISPLAY_TIME_ZONE must be Asia/Dhaka.");
  }

  return {
    ...input,
    DATABASE_URL: requirePostgresUrl(input.DATABASE_URL),
    DEFAULT_LOCALE: locale,
    DISPLAY_TIME_ZONE: timeZone,
    PORT: parsePort(input.PORT),
  };
}
