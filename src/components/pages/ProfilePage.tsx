import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, LifeBuoy } from "lucide-react";
import {
  ApiRequestError,
  fetchMyProfile,
  fetchUploadObjectUrl,
  isOwnUploadUrl,
  updateMyProfile,
  type UpdateProfilePayload,
} from "../../api/auth";
import { getUpazillasForDistrict, serviceDistricts } from "../../data";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { ListLoading } from "../EmptyState";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "documents", label: "Verification & documents" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const emptyProfile: UpdateProfilePayload = {
  address: "",
  district: "",
  focus: "",
  identity: "",
  name: "",
  organization: "",
  upazilla: "",
};

/**
 * The account's own profile, in the handoff's shape: identity card, section rail, one panel.
 *
 * Fields are edited in place rather than behind a modal, which is how the design has it — the
 * page is the form. Save is the same endpoint the buyer workspace has always used.
 */
export function ProfilePage({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [section, setSection] = useState<SectionId>("profile");
  const [saved, setSaved] = useState<UpdateProfilePayload>(emptyProfile);
  const [draft, setDraft] = useState<UpdateProfilePayload>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const accessToken = user?.accessToken;
  const isFarmer = user?.role === "farmer";
  const upazillas = getUpazillasForDistrict(draft.district);
  const hasDocument = isOwnUploadUrl(saved.identity);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;
    fetchMyProfile(accessToken)
      .then((account) => {
        if (!active) return;
        const next: UpdateProfilePayload = {
          address: account.address ?? "",
          district: account.district ?? "",
          focus: account.focus ?? "",
          identity: account.identity ?? "",
          name: account.name ?? "",
          organization: account.organization ?? "",
          upazilla: account.upazilla ?? "",
        };
        setSaved(next);
        setDraft(next);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load your profile.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const set = useCallback((field: keyof UpdateProfilePayload, value: string) => {
    // Changing district invalidates the upazilla under it, so it is cleared rather than left wrong.
    setDraft((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  }, []);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;

    setIsSaving(true);
    setError("");
    updateMyProfile(accessToken, draft)
      .then((account) => {
        setSaved(draft);
        setNotice("Profile updated.");
        onProfileSaved(account);
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not save your profile.");
      })
      .finally(() => setIsSaving(false));
  };

  const openDocument = () => {
    if (!accessToken || !hasDocument) return;
    fetchUploadObjectUrl(accessToken, saved.identity)
      .then(({ url }) => window.open(url, "_blank", "noopener,noreferrer"))
      .catch(() => setError("Could not open the document."));
  };

  const initials = (saved.name || user?.name || "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <section className="page-wrap profile-page">
      <div className="profile-page-head">
        <span className="profile-page-avatar" aria-hidden="true">{initials}</span>
        <div>
          <h1>{t(isFarmer ? "Farmer profile" : "Buyer profile")}</h1>
          <span>
            {saved.name || user?.name} · {t(isFarmer ? "Farmer" : "Buyer")}
            {saved.district ? ` · ${t(saved.district)}` : ""}
            <em className="verify-badge verified">
              <BadgeCheck aria-hidden="true" size={11} />
              {t("Verified")}
            </em>
          </span>
        </div>
        <a className="secondary-button profile-support" href="#support">
          <LifeBuoy aria-hidden="true" size={16} />
          {t("Contact support")}
        </a>
      </div>

      <div className="profile-page-layout">
        <nav className="profile-page-rail" aria-label={t("Profile sections")}>
          {SECTIONS.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "on" : ""}
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="profile-page-panel">
          {isLoading ? <ListLoading label={t("Loading your profile...")} /> : null}
          {error ? <p className="soft-notice warn">{t(error)}</p> : null}
          {notice ? <p className="soft-notice">{t(notice)}</p> : null}

          {!isLoading && section === "profile" ? (
            <form className="profile-form" onSubmit={save}>
              <h2>{t("Who you are on the marketplace")}</h2>
              <div className="profile-form-grid">
                <label className="input-field">
                  <span>{t("Display name")}</span>
                  <input onChange={(event) => set("name", event.target.value)} value={draft.name} />
                </label>
                <label className="input-field">
                  <span>{t("Phone (login)")}</span>
                  {/* Read-only: the number is the login, and changing it is an auth flow. */}
                  <input disabled value={user?.phone ?? ""} />
                </label>
                <label className="input-field">
                  <span>{t("Business / farm name")}</span>
                  <input onChange={(event) => set("organization", event.target.value)} value={draft.organization} />
                </label>
                <label className="input-field">
                  <span>{t("District")}</span>
                  <select onChange={(event) => set("district", event.target.value)} value={draft.district}>
                    <option value="">{t("Select service district")}</option>
                    {serviceDistricts.map((name) => (
                      <option key={name} value={name}>{t(name)}</option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Upazilla")}</span>
                  <select
                    disabled={!draft.district}
                    onChange={(event) => set("upazilla", event.target.value)}
                    value={draft.upazilla}
                  >
                    <option value="">{t(draft.district ? "Select upazilla" : "Select district first")}</option>
                    {upazillas.map((name) => (
                      <option key={name} value={name}>{t(name)}</option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t(isFarmer ? "Crop interest / supply focus" : "Crop interest")}</span>
                  <input onChange={(event) => set("focus", event.target.value)} value={draft.focus} />
                </label>
              </div>
              <label className="full-field">
                <span>{t("Address")}</span>
                <textarea onChange={(event) => set("address", event.target.value)} rows={3} value={draft.address} />
              </label>
              <div className="profile-form-actions">
                <button className="primary-button" disabled={isSaving} type="submit">
                  {t(isSaving ? "Saving" : "Save changes")}
                </button>
                <button className="secondary-button" type="button" onClick={() => setDraft(saved)}>
                  {t("Cancel")}
                </button>
              </div>
            </form>
          ) : null}

          {!isLoading && section === "documents" ? (
            <div className="profile-form">
              <h2>{t("Verification & documents")}</h2>
              <div className="profile-doc-card">
                <strong>{t("NID / trade licence")}</strong>
                {hasDocument ? (
                  <>
                    <span>{t("Uploaded document saved")}</span>
                    <button className="secondary-button" type="button" onClick={openDocument}>
                      {t("View document")}
                    </button>
                  </>
                ) : (
                  <span>{saved.identity || t("No document uploaded yet.")}</span>
                )}
              </div>
              <p className="panel-note">
                {t("Staff check this document before your account can post crops or place orders.")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
