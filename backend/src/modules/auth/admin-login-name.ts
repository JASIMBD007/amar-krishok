import { ConfigService } from "@nestjs/config";

export const DEFAULT_ADMIN_LOGIN_NAME = "admin_amarkrishok";

export function getAdminLoginName(config: ConfigService) {
  return config.get<string>("ADMIN_LOGIN_NAME")?.trim() || DEFAULT_ADMIN_LOGIN_NAME;
}

export function getAdminUsername(config: ConfigService) {
  return config.get<string>("ADMIN_USERNAME")?.trim() || getAdminLoginName(config);
}
