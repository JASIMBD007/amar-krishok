import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import {
  ApiRequestError,
  fetchAdminAccounts,
  updateBackendVerification,
} from "../../api/auth";
import { useTranslate } from "../../i18n";
import type {
  AccountStatus,
  AuthUser,
  ChatThread,
  RegisteredAccount,
} from "../../types";
import { MarketSection } from "./admin";

export function AdminPage({
  onUpdateRegistration,
  registrations,
  user,
}: {
  chatThreads: ChatThread[];
  onAdminReply: (threadId: string, text: string) => void;
  onThreadOpen: (threadId: string) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [backendRegistrations, setBackendRegistrations] = useState<RegisteredAccount[] | null>(null);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) {
      return;
    }

    fetchAdminAccounts(user.accessToken)
      .then((accounts) => {
        setBackendRegistrations(accounts);
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(
          error instanceof ApiRequestError
            ? error.message
            : "Backend service is unavailable. Please try again.",
        );
      });
  }, [user?.accessToken, user?.role]);

  const updateRegistration = (id: string, status: AccountStatus) => {
    if (!user?.accessToken) {
      onUpdateRegistration(id, status);
      return;
    }

    updateBackendVerification(user.accessToken, id, status)
      .then((account) => {
        setBackendRegistrations((current) =>
          (current ?? registrations).map((item) => (item.id === id ? account : item)),
        );
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(
          error instanceof ApiRequestError
            ? error.message
            : "Backend service is unavailable. Please try again.",
        );
      });
  };

  return (
    <section className="admin-console-page">
      <header className="admin-console-heading">
        <div>
          <h1>{t("Admin console")}</h1>
          <span>
            {user?.name ?? t("Staff")} · {t("Admin")} · {t("every action is logged")}
          </span>
        </div>
        <span className="admin-staff-pill">
          <Shield aria-hidden="true" size={13} />
          {t("Staff access")}
        </span>
      </header>

      {verificationError ? (
        <p className="marketplace-feedback warning">{t(verificationError)}</p>
      ) : null}

      <MarketSection
        onUpdateRegistration={updateRegistration}
        registrations={backendRegistrations ?? registrations}
        user={user}
      />
    </section>
  );
}
