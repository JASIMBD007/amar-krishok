import { Gauge, TrendingDown, TrendingUp } from "lucide-react";
import type { DashboardStat, Order, RegistrationRole, Role } from "../../types";

export function makeRegistrationId(role: RegistrationRole) {
  return `${role.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function roleCanOpenPath(role: Role, path: string) {
  if (path.startsWith("/admin")) {
    return role === "admin";
  }

  if (path.startsWith("/buyer")) {
    return role === "buyer" || role === "admin";
  }

  if (path.startsWith("/desk") || path.startsWith("/farmer")) {
    return role === "farmer" || role === "admin";
  }

  return true;
}

export function TrendIcon({ trend }: { trend: DashboardStat["trend"] }) {
  if (trend === "down") {
    return <TrendingDown size={17} />;
  }

  if (trend === "up") {
    return <TrendingUp size={17} />;
  }

  return <Gauge size={17} />;
}

export function statusClass(status: Order["status"]) {
  return status.toLowerCase().replaceAll(" ", "-");
}
