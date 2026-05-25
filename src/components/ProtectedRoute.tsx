import React from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { AuthUser, Role } from "../types";
import type { Translator } from "./shared";

export function ProtectedRoute({
  allowedRoles,
  children,
  t,
  user,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
  t: Translator;
  user: AuthUser | null;
}) {
  const location = useLocation();

  if (!user) {
    const fallbackRole = allowedRoles[0];
    return <Navigate to={`/login?role=${fallbackRole}&next=${encodeURIComponent(location.pathname)}`} replace />;
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
            <NavLink className="secondary-button" to={`/login?role=${allowedRoles[0]}&next=${encodeURIComponent(location.pathname)}`}>
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

  return children;
}
