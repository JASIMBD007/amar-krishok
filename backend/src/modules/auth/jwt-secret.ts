import { ConfigService } from "@nestjs/config";

const INSECURE_DEFAULTS = new Set(["local-development-secret", "change-this-secret-before-production"]);

export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_SECRET")?.trim();

  if (!secret || INSECURE_DEFAULTS.has(secret)) {
    throw new Error("JWT_SECRET environment variable must be set to a strong, unique value before the API can start.");
  }

  return secret;
}

/**
 * A token is stale once the account's password has changed under it. Tokens issued before the version
 * claim existed carry none, and are treated as version 0 so live sessions survive the rollout.
 */
export function tokenVersionMatches(payload: Record<string, unknown>, user: { tokenVersion: number }) {
  const claimed = typeof payload.version === "number" ? payload.version : 0;
  return claimed === user.tokenVersion;
}
