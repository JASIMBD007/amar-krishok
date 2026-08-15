import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BadgeCheck,
  Camera,
  Eye,
  EyeOff,
  FileCheck2,
  LifeBuoy,
  Monitor,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  ApiRequestError,
  changeMyPassword,
  fetchMyProfile,
  fetchUploadObjectUrl,
  isOwnUploadUrl,
  updateMyNotificationPreferences,
  updateMyPayment,
  updateMyProfile,
  uploadFile,
  type NotificationPreferencesPayload,
  type ProfilePaymentMethod,
  type UpdateProfilePayload,
} from "../../api/auth";
import { getUpazillasForDistrict, serviceDistricts } from "../../data";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { ListLoading } from "../EmptyState";

type SectionId = "profile" | "documents" | "payment" | "notifications" | "security";

type ProfileDraft = {
  bio: string;
  district: string;
  email: string;
  name: string;
  upazilla: string;
};

const emptyDraft: ProfileDraft = { bio: "", district: "", email: "", name: "", upazilla: "" };
const emptyNotifications: NotificationPreferencesPayload = {
  appNotifications: true,
  smsOrderUpdates: true,
  smsRateAlerts: true,
  weeklySummary: false,
};

function requestMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function accountDraft(account: RegisteredAccount): ProfileDraft {
  return {
    bio: account.bio,
    district: account.district,
    email: account.email,
    name: account.name,
    upazilla: account.upazilla,
  };
}

function browserName() {
  const agent = navigator.userAgent;
  if (agent.includes("Firefox/")) return "Firefox";
  if (agent.includes("Edg/")) return "Microsoft Edge";
  if (agent.includes("Chrome/")) return "Chrome";
  if (agent.includes("Safari/")) return "Safari";
  return "Web browser";
}

/**
 * The handoff's five-section account workspace, backed entirely by the signed-in account.
 * Sample identities, payout accounts and devices from the prototype are deliberately never used.
 */
export function ProfilePage({
  onContactSupport,
  onProfileSaved,
  user,
}: {
  onContactSupport: () => void;
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const accessToken = user?.accessToken;
  const isFarmer = user?.role === "farmer";
  const sections = useMemo(
    () => [
      { id: "profile" as const, label: "Profile" },
      ...(isFarmer ? [{ id: "documents" as const, label: "Verification & documents" }] : []),
      { id: "payment" as const, label: isFarmer ? "Payouts" : "Payment methods" },
      { id: "notifications" as const, label: "Notifications" },
      { id: "security" as const, label: "Security" },
    ],
    [isFarmer],
  );

  const [section, setSection] = useState<SectionId>("profile");
  const [account, setAccount] = useState<RegisteredAccount | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [paymentMethod, setPaymentMethod] = useState<ProfilePaymentMethod>("BKASH");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [notifications, setNotifications] = useState<NotificationPreferencesPayload>(emptyNotifications);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [nidNumber, setNidNumber] = useState("");
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const hydrateAccount = useCallback((next: RegisteredAccount) => {
    setAccount(next);
    setDraft(accountDraft(next));
    setPaymentMethod(next.paymentMethod);
    setPaymentAccount(next.paymentAccount);
    setNidNumber(next.nidNumber);
    setNotifications({
      appNotifications: next.appNotifications,
      smsOrderUpdates: next.smsOrderUpdates,
      smsRateAlerts: next.smsRateAlerts,
      weeklySummary: next.weeklySummary,
    });
  }, []);

  const applyAccount = useCallback((next: RegisteredAccount) => {
    hydrateAccount(next);
    onProfileSaved(next);
  }, [hydrateAccount, onProfileSaved]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    let active = true;
    fetchMyProfile(accessToken)
      .then((next) => {
        if (!active) return;
        hydrateAccount(next);
      })
      .catch((requestError) => {
        if (active) setError(requestMessage(requestError, "Could not load your profile."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, hydrateAccount]);

  useEffect(() => {
    if (!accessToken || !account?.avatarUrl || !isOwnUploadUrl(account.avatarUrl)) {
      setAvatarObjectUrl("");
      return;
    }
    let active = true;
    let objectUrl = "";
    fetchUploadObjectUrl(accessToken, account.avatarUrl)
      .then(({ url }) => {
        objectUrl = url;
        if (active) setAvatarObjectUrl(url);
      })
      .catch(() => {
        if (active) setAvatarObjectUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, account?.avatarUrl]);

  const upazillas = getUpazillasForDistrict(draft.district);
  const setProfileField = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };
  const startSave = () => {
    setError("");
    setNotice("");
    setIsSaving(true);
  };
  const finishSave = () => setIsSaving(false);

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    startSave();
    const payload: Partial<UpdateProfilePayload> = draft;
    updateMyProfile(accessToken, payload)
      .then((next) => {
        applyAccount(next);
        setNotice("Profile updated.");
      })
      .catch((requestError) => setError(requestMessage(requestError, "Could not save your profile.")))
      .finally(finishSave);
  };

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !accessToken) return;
    startSave();
    try {
      const uploaded = await uploadFile(accessToken, file, "profile-avatar");
      const next = await updateMyProfile(accessToken, { avatarUrl: uploaded.url });
      applyAccount(next);
      setNotice("Profile photo updated.");
    } catch (requestError) {
      setError(requestMessage(requestError, "Could not update your profile photo."));
    } finally {
      finishSave();
    }
  };

  const openPrivateFile = async (value: string) => {
    if (!accessToken || !isOwnUploadUrl(value)) return;
    try {
      const { url } = await fetchUploadObjectUrl(accessToken, value);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (requestError) {
      setError(requestMessage(requestError, "Could not open the document."));
    }
  };

  const saveDocuments = async () => {
    if (!accessToken || !account || (!identityFile && !payoutProofFile && nidNumber === account.nidNumber)) return;
    startSave();
    try {
      const payload: Partial<UpdateProfilePayload> = {};
      payload.nidNumber = nidNumber;
      if (identityFile) payload.identity = (await uploadFile(accessToken, identityFile, "identity-document")).url;
      if (payoutProofFile) payload.payoutProof = (await uploadFile(accessToken, payoutProofFile, "payout-proof")).url;
      const next = await updateMyProfile(accessToken, payload);
      applyAccount(next);
      setIdentityFile(null);
      setPayoutProofFile(null);
      setNotice("Documents updated.");
    } catch (requestError) {
      setError(requestMessage(requestError, "Could not save your documents."));
    } finally {
      finishSave();
    }
  };

  const savePayment = (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    startSave();
    updateMyPayment(accessToken, { account: paymentAccount, method: paymentMethod })
      .then((next) => {
        applyAccount(next);
        setNotice("Payment details updated.");
      })
      .catch((requestError) => setError(requestMessage(requestError, "Could not save your payment details.")))
      .finally(finishSave);
  };

  const saveNotifications = () => {
    if (!accessToken) return;
    startSave();
    updateMyNotificationPreferences(accessToken, notifications)
      .then((next) => {
        applyAccount(next);
        setNotice("Notification preferences updated.");
      })
      .catch((requestError) => setError(requestMessage(requestError, "Could not save notification preferences.")))
      .finally(finishSave);
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    startSave();
    changeMyPassword(accessToken, { currentPassword, newPassword })
      .then(() => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setNotice("Password updated.");
      })
      .catch((requestError) => setError(requestMessage(requestError, "Could not change your password.")))
      .finally(finishSave);
  };

  const initials = (account?.name || user?.name || "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const roleLabel = isFarmer ? "Farmer" : "Buyer";

  return (
    <section className="page-wrap profile-page">
      <header className="profile-page-head">
        <span className={`profile-page-avatar${avatarObjectUrl ? " has-photo" : ""}`} aria-hidden="true">
          {avatarObjectUrl ? <img alt="" src={avatarObjectUrl} /> : initials}
        </span>
        <div className="profile-page-identity">
          <h1>{t(isFarmer ? "Farmer profile" : "Buyer profile")}</h1>
          <span>
            {account?.name || user?.name} · {t(roleLabel)}
            {account?.district ? ` · ${t(account.district)}` : ""}
            {account?.verifiedAt ? (
              <em className="verify-badge verified">
                <BadgeCheck aria-hidden="true" size={13} />
                {t("Verified")}
              </em>
            ) : null}
          </span>
        </div>
        <div className="profile-header-actions">
          <label className={`secondary-button profile-photo-button${isSaving ? " disabled" : ""}`}>
            <Camera aria-hidden="true" size={17} />
            {t("Change photo")}
            <input accept="image/jpeg,image/png,image/webp,image/gif" disabled={isSaving} type="file" onChange={changePhoto} />
          </label>
          <button className="secondary-button" type="button" onClick={onContactSupport}>
            <LifeBuoy aria-hidden="true" size={17} />
            {t("Contact support")}
          </button>
        </div>
      </header>

      <div className="profile-page-layout">
        <nav className="profile-page-rail" aria-label={t("Profile sections") }>
          {sections.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "on" : ""}
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setError("");
                setNotice("");
              }}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="profile-page-panel">
          {isLoading ? <ListLoading label={t("Loading your profile...")} /> : null}
          {error ? <p className="soft-notice warn" role="alert">{t(error)}</p> : null}
          {notice ? <p className="profile-success-bar" role="status">{t(notice)}</p> : null}

          {!isLoading && account && section === "profile" ? (
            <form className="profile-form" onSubmit={saveProfile}>
              <h2>{t("Who you are on the marketplace")}</h2>
              <div className="profile-form-grid">
                <label className="input-field">
                  <span>{t("Display name")}</span>
                  <input required value={draft.name} onChange={(event) => setProfileField("name", event.target.value)} />
                </label>
                <label className="input-field profile-phone-field">
                  <span>{t("Phone (login)")}</span>
                  <input disabled value={user?.phone ?? account.phone} />
                  <small>{t("Contact support to change your login number.")}</small>
                </label>
                <label className="input-field">
                  <span>{t("Email (optional)")}</span>
                  <input type="email" value={draft.email} onChange={(event) => setProfileField("email", event.target.value)} />
                </label>
                <label className="input-field">
                  <span>{t("District")}</span>
                  <select required value={draft.district} onChange={(event) => setProfileField("district", event.target.value)}>
                    <option value="">{t("Select service district")}</option>
                    {serviceDistricts.map((name) => <option key={name} value={name}>{t(name)}</option>)}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Upazilla")}</span>
                  <select
                    disabled={!draft.district}
                    required
                    value={draft.upazilla}
                    onChange={(event) => setProfileField("upazilla", event.target.value)}
                  >
                    <option value="">{t(draft.district ? "Select upazilla" : "Select district first")}</option>
                    {upazillas.map((name) => <option key={name} value={name}>{t(name)}</option>)}
                  </select>
                </label>
              </div>
              <label className="full-field">
                <span>{t("About — buyers and farmers see this")}</span>
                <textarea rows={4} value={draft.bio} onChange={(event) => setProfileField("bio", event.target.value)} />
              </label>
              <div className="profile-form-actions">
                <button className="primary-button" disabled={isSaving} type="submit">{t(isSaving ? "Saving" : "Save changes")}</button>
                <button className="secondary-button" disabled={isSaving} type="button" onClick={() => setDraft(accountDraft(account))}>{t("Cancel")}</button>
              </div>
            </form>
          ) : null}

          {!isLoading && account && section === "documents" ? (
            <div className="profile-form">
              <div className="profile-panel-heading">
                <h2>{t("Verification & documents")}</h2>
                {account.verifiedAt ? <span className="profile-status-pill"><BadgeCheck size={14} />{t("Verified by staff")}</span> : null}
              </div>
              <label className="input-field profile-nid-field">
                <span>{t("NID number")}</span>
                <input className="mono" value={nidNumber} onChange={(event) => setNidNumber(event.target.value)} />
              </label>
              <div className="profile-document-grid">
                <DocumentTile
                  file={identityFile}
                  label="NID / trade licence"
                  savedValue={account.identity}
                  t={t}
                  onFile={setIdentityFile}
                  onView={() => openPrivateFile(account.identity)}
                />
                <DocumentTile
                  file={payoutProofFile}
                  label="Bank / bKash proof"
                  note="Optional — speeds up payouts"
                  savedValue={account.payoutProof}
                  t={t}
                  onFile={setPayoutProofFile}
                  onView={() => openPrivateFile(account.payoutProof)}
                />
              </div>
              <button className="primary-button profile-save-button" disabled={isSaving || (!identityFile && !payoutProofFile && nidNumber === account.nidNumber)} type="button" onClick={saveDocuments}>
                {t(isSaving ? "Saving" : "Save documents")}
              </button>
            </div>
          ) : null}

          {!isLoading && account && section === "payment" ? (
            <form className="profile-form" onSubmit={savePayment}>
              <h2>{t("Where the money goes")}</h2>
              <div className="profile-form-grid profile-payment-grid">
                <label className="input-field">
                  <span>{t("Method")}</span>
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as ProfilePaymentMethod)}>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="BANK">{t("Bank transfer")}</option>
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Account number")}</span>
                  <input className="mono" required value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} />
                </label>
              </div>
              <div className="profile-payment-note">
                <ShieldCheck aria-hidden="true" size={18} />
                <span>{t("Escrow releases to this account within 2 hours of a confirmed delivery. Changing the account pauses payouts for 24 hours as a fraud check.")}</span>
              </div>
              <button className="primary-button profile-save-button" disabled={isSaving} type="submit">{t(isSaving ? "Saving" : "Save payout details")}</button>
            </form>
          ) : null}

          {!isLoading && account && section === "notifications" ? (
            <div className="profile-form">
              <h2>{t("What we send you")}</h2>
              <div className="profile-toggle-list">
                <PreferenceRow checked={notifications.smsOrderUpdates} description="Pickup, delivery and escrow release for every order." label="Order updates by SMS" t={t} onChange={(value) => setNotifications((current) => ({ ...current, smsOrderUpdates: value }))} />
                <PreferenceRow checked={notifications.smsRateAlerts} description="Today's district rate for the crops you trade." label="Daily rate alert (08:00)" t={t} onChange={(value) => setNotifications((current) => ({ ...current, smsRateAlerts: value }))} />
                <PreferenceRow checked={notifications.appNotifications} description="Everything, collected in the notification centre." label="In-app notifications" t={t} onChange={(value) => setNotifications((current) => ({ ...current, appNotifications: value }))} />
                <PreferenceRow checked={notifications.weeklySummary} description="Volume, average price and payouts, every Friday." label="Weekly summary" t={t} onChange={(value) => setNotifications((current) => ({ ...current, weeklySummary: value }))} />
              </div>
              <button className="primary-button profile-save-button" disabled={isSaving} type="button" onClick={saveNotifications}>{t(isSaving ? "Saving" : "Save preferences")}</button>
            </div>
          ) : null}

          {!isLoading && account && section === "security" ? (
            <form className="profile-form" onSubmit={savePassword}>
              <h2>{t("Security")}</h2>
              <div className="profile-password-grid">
                <PasswordField label="Current password" show={showCurrentPassword} t={t} value={currentPassword} onChange={setCurrentPassword} onToggle={() => setShowCurrentPassword((value) => !value)} />
                <PasswordField label="New password" show={showNewPassword} t={t} value={newPassword} onChange={setNewPassword} onToggle={() => setShowNewPassword((value) => !value)} />
                <PasswordField label="Confirm new password" show={showNewPassword} t={t} value={confirmPassword} onChange={setConfirmPassword} onToggle={() => setShowNewPassword((value) => !value)} />
              </div>
              <button className="primary-button profile-save-button" disabled={isSaving || !currentPassword || !newPassword || !confirmPassword} type="submit">{t(isSaving ? "Saving" : "Change password")}</button>
              <div className="profile-device-section">
                <h3>{t("Signed-in devices")}</h3>
                <div className="profile-device-row">
                  <Monitor aria-hidden="true" size={18} />
                  <span>{t(browserName())}</span>
                  <em>{t("This device")}</em>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DocumentTile({
  file,
  label,
  note,
  onFile,
  onView,
  savedValue,
  t,
}: {
  file: File | null;
  label: string;
  note?: string;
  onFile: (file: File | null) => void;
  onView: () => void;
  savedValue: string;
  t: (value: string) => string;
}) {
  const hasSavedFile = isOwnUploadUrl(savedValue);
  return (
    <div className="profile-document-tile">
      {hasSavedFile ? <FileCheck2 aria-hidden="true" size={23} /> : <Upload aria-hidden="true" size={23} />}
      <strong>{t(label)}</strong>
      <span>{file?.name || (hasSavedFile ? t("Uploaded document saved") : t(note || "No document uploaded yet."))}</span>
      <div>
        {hasSavedFile ? <button className="secondary-button compact" type="button" onClick={onView}>{t("View")}</button> : null}
        <label className="secondary-button compact profile-file-button">
          {t(hasSavedFile ? "Replace" : "Upload")}
          <input accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" type="file" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>
    </div>
  );
}

function PreferenceRow({
  checked,
  description,
  label,
  onChange,
  t,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
  t: (value: string) => string;
}) {
  return (
    <div className="profile-toggle-row">
      <div><strong>{t(label)}</strong><span>{t(description)}</span></div>
      <button aria-checked={checked} aria-label={t(label)} className={`profile-toggle${checked ? " on" : ""}`} role="switch" type="button" onClick={() => onChange(!checked)}><span /></button>
    </div>
  );
}

function PasswordField({
  label,
  onChange,
  onToggle,
  show,
  t,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  show: boolean;
  t: (value: string) => string;
  value: string;
}) {
  return (
    <label className="input-field profile-password-field">
      <span>{t(label)}</span>
      <span className="profile-password-input">
        <input minLength={4} required type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} />
        <button aria-label={t(show ? "Hide password" : "Show password")} type="button" onClick={onToggle}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </span>
    </label>
  );
}
