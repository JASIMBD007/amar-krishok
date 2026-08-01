import { ConfigService } from "@nestjs/config";

const INSECURE_DEFAULTS = new Set(["local-development-secret", "change-this-secret-before-production"]);

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_SECRET")?.trim();

  if (!secret || INSECURE_DEFAULTS.has(secret)) {
    throw new Error("JWT_SECRET environment variable must be set to a strong, unique value before the API can start.");
  }

  return secret;
}
