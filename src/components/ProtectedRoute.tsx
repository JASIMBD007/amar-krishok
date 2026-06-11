import React from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { AuthUser, Role } from "../types";
import type { Translator } from "./shared";

type ProtectedRouteProps = React.PropsWithChildren<{
  allowedRoles: Role[];
  t: Translator;
  user: AuthUser | null;
}>;

export function ProtectedRoute({
  allowedRoles,
  children,
  t,
  user,
}: ProtectedRouteProps): React.JSX.Element {
  const location = useLocation();

  if (!user || !user.accessToken) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <section className="page-wrap auth-layout">
        <div className="panel auth-panel">
          <ShieldCheck size={28} />
          <span>{t("Protected area")}</span>
          <h1>{t("This page is protected")}</h1>
          <p>{t("Your current role cannot open this page.")}</p>
          <div className="auth-actions">
            <NavLink className="secondary-button" to={`/login?next=${encodeURIComponent(location.pathname)}`}>
              {t("Switch account")}
            </NavLink>
            <NavLink className="primary-button" to="/">
              {t("Go home")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
