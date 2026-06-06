import { CheckCircle2, Clock3, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import type { AdminPasswordResetRequest } from "../../../api/auth";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import { formatLocalizedDate } from "../../../utils/dateInput";
import { MessagesPanel, SettingsPanel } from "./AdminPanels";
import { AdminSnackbar, type AdminToast } from "./AccountManagementTools";

function resetStatusLabel(status: AdminPasswordResetRequest["status"]) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function resetStatusClass(status: AdminPasswordResetRequest["status"]) {
  return status === "approved" ? "active" : status;
}

function PasswordResetReviewPanel({
  onApprovePasswordReset,
  onRejectPasswordReset,
  passwordResetError,
  passwordResetRequests,
}: {
  onApprovePasswordReset: (id: string) => Promise<void>;
  onRejectPasswordReset: (id: string) => Promise<void>;
  passwordResetError: string;
  passwordResetRequests: AdminPasswordResetRequest[];
}) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [workingRequestId, setWorkingRequestId] = useState<string | null>(null);
  const pendingCount = passwordResetRequests.filter((request) => request.status === "pending").length;
  const reviewedCount = passwordResetRequests.length - pendingCount;
  const sortedRequests = [...passwordResetRequests].sort((first, second) => {
    if (first.status === "pending" && second.status !== "pending") {
      return -1;
    }

    if (first.status !== "pending" && second.status === "pending") {
      return 1;
    }

    return new Date(second.requestedAt).getTime() - new Date(first.requestedAt).getTime();
  });

  const reviewRequest = async (id: string, action: "approve" | "reject") => {
    setWorkingRequestId(id);
    setToast(null);

    try {
      if (action === "approve") {
        await onApprovePasswordReset(id);
        setToast({ message: "Password reset approved.", tone: "success" });
        return;
      }

      await onRejectPasswordReset(id);
      setToast({ message: "Password reset rejected.", tone: "success" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Password reset review failed.",
        tone: "error",
      });
    } finally {
      setWorkingRequestId(null);
    }
  };

  return (
    <section className="panel verification-panel admin-wide-panel password-reset-review-panel" aria-labelledby="password-reset-review-heading">
      <div className="panel-header">
        <div>
          <span>{t("Account security")}</span>
          <h2 id="password-reset-review-heading">{t("Password reset requests")}</h2>
        </div>
        <KeyRound size={22} />
      </div>
      <p>{t("Review requested password changes before they become active.")}</p>

      <div className="verification-stats">
        <span>
          <strong>{v(pendingCount)}</strong>
          {t("Pending reset requests")}
        </span>
        <span>
          <strong>{v(reviewedCount)}</strong>
          {t("Reviewed reset requests")}
        </span>
      </div>

      {passwordResetError && <p className="auth-error">{t(passwordResetError)}</p>}

      <div className="table-wrap account-table-wrap">
        <table className="account-table password-reset-table">
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Mobile number")}</th>
              <th>{t("Account type")}</th>
              <th>{t("District")}</th>
              <th>{t("Requested")}</th>
              <th>{t("Status")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRequests.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <em className="empty-table-note">{t("No password reset requests right now")}</em>
                </td>
              </tr>
            )}
            {sortedRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <strong>{request.user.name}</strong>
                  <span>@{request.user.username}</span>
                </td>
                <td>{request.phone}</td>
                <td>{t(request.role === "farmer" ? "Seller / Farmer" : "Buyer")}</td>
                <td>
                  <strong>{request.user.district || t("District not added")}</strong>
                  <span>{request.user.upazilla || t("Upazilla not added")}</span>
                </td>
                <td>
                  <strong>{formatLocalizedDate(request.requestedAt, language, t("Not added"), { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" })}</strong>
                  {request.reviewedAt && <span>{t("Reviewed")}: {formatLocalizedDate(request.reviewedAt, language, t("Not added"), { day: "numeric", month: "short" })}</span>}
                </td>
                <td>
                  <div className={`account-status-chip ${resetStatusClass(request.status)}`}>
                    {request.status === "approved" ? <CheckCircle2 size={16} /> : request.status === "rejected" ? <XCircle size={16} /> : <Clock3 size={16} />}
                    {t(resetStatusLabel(request.status))}
                  </div>
                </td>
                <td>
                  {request.status === "pending" ? (
                    <div className="table-actions">
                      <button
                        className="secondary-button danger-button compact-action"
                        type="button"
                        disabled={workingRequestId === request.id}
                        onClick={() => reviewRequest(request.id, "reject")}
                      >
                        <XCircle size={15} />
                        {t("Reject reset")}
                      </button>
                      <button
                        className="primary-button compact-action"
                        type="button"
                        disabled={workingRequestId === request.id}
                        onClick={() => reviewRequest(request.id, "approve")}
                      >
                        <ShieldCheck size={15} />
                        {t("Approve reset")}
                      </button>
                    </div>
                  ) : (
                    <span className="reviewed-by-text">
                      {t("Reviewed by")} {request.reviewedBy?.name || t("Admin")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminSnackbar toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}

export function SettingsSection({
  onApprovePasswordReset,
  onRejectPasswordReset,
  passwordResetError,
  passwordResetRequests,
}: {
  onApprovePasswordReset: (id: string) => Promise<void>;
  onRejectPasswordReset: (id: string) => Promise<void>;
  passwordResetError: string;
  passwordResetRequests: AdminPasswordResetRequest[];
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <PasswordResetReviewPanel
        onApprovePasswordReset={onApprovePasswordReset}
        onRejectPasswordReset={onRejectPasswordReset}
        passwordResetError={passwordResetError}
        passwordResetRequests={passwordResetRequests}
      />
      <SettingsPanel />
      <MessagesPanel />
    </section>
  );
}
