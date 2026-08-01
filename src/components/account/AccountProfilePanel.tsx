import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, FileImage, LockKeyhole, PencilLine, Save, Upload, X } from "lucide-react";
import { ApiRequestError, fetchMyProfile, fetchUploadObjectUrl, isOwnUploadUrl, updateMyProfile, uploadFile, type UpdateProfilePayload } from "../../api/auth";
import { getUpazillasForDistrict, serviceDistricts } from "../../data";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { FormGrid } from "../shared";

const emptyProfile: UpdateProfilePayload = {
  address: "",
  district: "",
  upazilla: "",
  focus: "",
  identity: "",
  name: "",
  organization: "",
};

export function AccountProfilePanel({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [profile, setProfile] = useState<UpdateProfilePayload>(emptyProfile);
  const [draftProfile, setDraftProfile] = useState<UpdateProfilePayload>(emptyProfile);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const canEditProfile = user?.role === "buyer" || user?.role === "farmer";
  const hasUploadedDocument = isOwnUploadUrl(profile.identity);
  const availableUpazillas = getUpazillasForDistrict(draftProfile.district);

  const openUploadedDocument = async () => {
    if (!user?.accessToken || isOpeningDocument) {
      return;
    }

    setIsOpeningDocument(true);
    setError("");
    try {
      const { url } = await fetchUploadObjectUrl(user.accessToken, profile.identity);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (apiError) {
      setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load the document.");
    } finally {
      setIsOpeningDocument(false);
    }
  };

  useEffect(() => {
    if (!user?.accessToken || !canEditProfile) {
      return;
    }

    setIsLoading(true);
    fetchMyProfile(user.accessToken)
      .then((account) => {
        const nextProfile = {
          address: account.address,
          district: account.district,
          upazilla: account.upazilla,
          focus: account.focus,
          identity: account.identity,
          name: account.name,
          organization: account.organization,
        };
        setProfile(nextProfile);
        setDraftProfile(nextProfile);
        setError("");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load profile.");
      })
      .finally(() => setIsLoading(false));
  }, [canEditProfile, user?.accessToken]);

  const updateField = (field: keyof UpdateProfilePayload, value: string) => {
    setDraftProfile((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const openEditModal = () => {
    setDraftProfile(profile);
    setIdentityFile(null);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setDraftProfile(profile);
    setIdentityFile(null);
    setError("");
    setIsModalOpen(false);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken || !canEditProfile) {
      setError("Only buyer and seller accounts can edit their own profile.");
      return;
    }

    if (!draftProfile.name.trim() || !draftProfile.organization.trim() || !draftProfile.district.trim() || !draftProfile.upazilla.trim() || !draftProfile.address.trim() || (!draftProfile.identity.trim() && !identityFile) || !draftProfile.focus.trim()) {
      setError("Please fill in all profile fields.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const uploadedIdentity = identityFile ? await uploadFile(user.accessToken, identityFile, "identity-document") : null;
      const account = await updateMyProfile(user.accessToken, {
        address: draftProfile.address.trim(),
        district: draftProfile.district.trim(),
        upazilla: draftProfile.upazilla.trim(),
        focus: draftProfile.focus.trim(),
        identity: uploadedIdentity?.url ?? draftProfile.identity.trim(),
        name: draftProfile.name.trim(),
        organization: draftProfile.organization.trim(),
      });
      const nextProfile = {
        address: account.address,
        district: account.district,
        upazilla: account.upazilla,
        focus: account.focus,
        identity: account.identity,
        name: account.name,
        organization: account.organization,
      };
      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIdentityFile(null);
      onProfileSaved(account);
      setSuccess("Profile updated.");
      setIsModalOpen(false);
    } catch (apiError) {
      setError(apiError instanceof ApiRequestError ? apiError.message : "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEditProfile) {
    return (
      <section className="panel profile-panel">
        <div className="panel-header">
          <div>
            <span>{t("Profile access")}</span>
            <h2>{t("Own profile editing")}</h2>
          </div>
          <LockKeyhole size={22} />
        </div>
        <p className="panel-copy">{t("Admins can view account data, but buyers and sellers edit their own profile after login.")}</p>
      </section>
    );
  }

  return (
    <section className="panel profile-panel organized-profile-panel">
      <div className="panel-header profile-summary-header">
        <div>
          <span>{t("My profile")}</span>
          <h2>{t("Account information")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={openEditModal} disabled={isLoading}>
          <PencilLine size={17} />
          {t("Edit profile")}
        </button>
      </div>

      <p className="panel-copy">{t("You can update profile information. Orders and crop lot records stay read-only.")}</p>
      {success && <p className="auth-notice">{t(success)}</p>}
      {error && !isModalOpen && <p className="auth-error">{t(error)}</p>}

      <div className="profile-summary-grid" aria-label={t("My profile")}>
        <article>
          <span>{t("Full name")}</span>
          <strong>{profile.name || user?.name || t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("Username")}</span>
          <strong>{user?.username || t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("Verified phone")}</span>
          <strong>{user?.phone || t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("Business / farm name")}</span>
          <strong>{profile.organization || t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("District")}</span>
          <strong>{profile.district ? t(profile.district) : t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("Upazilla")}</span>
          <strong>{profile.upazilla ? t(profile.upazilla) : t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("Address")}</span>
          <strong>{profile.address || t("Not provided")}</strong>
        </article>
        <article>
          <span>{t("NID / trade license")}</span>
          <strong>{profile.identity ? t("Uploaded document saved") : t("No document uploaded")}</strong>
          {hasUploadedDocument && (
            <button type="button" className="link-button" onClick={openUploadedDocument} disabled={isOpeningDocument}>
              <ExternalLink size={14} />
              {t(isOpeningDocument ? "Loading document" : "View document")}
            </button>
          )}
        </article>
        <article>
          <span>{t("Crop interest / supply focus")}</span>
          <strong>{profile.focus || t("Not provided")}</strong>
        </article>
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal profile-edit-modal" onSubmit={saveProfile}>
            <div className="admin-modal-header">
              <div>
                <span>{t("My profile")}</span>
                <h2>{t("Edit account information")}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={closeEditModal}>
                <X size={18} />
              </button>
            </div>

            <FormGrid>
              <label className="input-field">
                <span>{t("Full name")}</span>
                <input value={draftProfile.name} onChange={(event) => updateField("name", event.target.value)} placeholder={t("Sample full name")} />
              </label>
              <label className="input-field">
                <span>{t("Business / farm name")}</span>
                <input value={draftProfile.organization} onChange={(event) => updateField("organization", event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
              </label>
              <label className="input-field">
                <span>{t("District")}</span>
                <select value={draftProfile.district} onChange={(event) => updateField("district", event.target.value)}>
                  <option value="" disabled>
                    {t("Select service district")}
                  </option>
                  {serviceDistricts.map((district) => (
                    <option key={district} value={district}>
                      {t(district)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span>{t("Upazilla")}</span>
                <select value={draftProfile.upazilla} onChange={(event) => updateField("upazilla", event.target.value)} disabled={!draftProfile.district}>
                  <option value="" disabled>
                    {t(draftProfile.district ? "Select upazilla" : "Select district first")}
                  </option>
                  {availableUpazillas.map((upazilla) => (
                    <option key={upazilla} value={upazilla}>
                      {t(upazilla)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span>{t("Address")}</span>
                <input value={draftProfile.address} onChange={(event) => updateField("address", event.target.value)} placeholder={t("Dhaka North")} />
              </label>
              <div className="input-field upload-field">
                <span>{t("NID / trade license image")}</span>
                <div className="file-picker-row">
                  <label className="file-picker-button">
                    <input className="hidden-file-input" accept="image/*,application/pdf" onChange={(event) => setIdentityFile(event.target.files?.[0] ?? null)} type="file" />
                    <FileImage size={16} />
                    {t("Choose file")}
                  </label>
                  <span className="file-picker-name">{identityFile?.name ?? (draftProfile.identity ? t("Existing document kept") : t("No file chosen"))}</span>
                </div>
                <em>
                  <FileImage size={16} />
                  {identityFile?.name ?? (draftProfile.identity ? t("Existing document kept") : t("Choose an image or PDF"))}
                </em>
              </div>
              <label className="input-field profile-focus-field">
                <span>{t("Crop interest / supply focus")}</span>
                <input value={draftProfile.focus} onChange={(event) => updateField("focus", event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
              </label>
            </FormGrid>

            {error && <p className="auth-error">{t(error)}</p>}
            <div className="modal-action-row">
              <button className="secondary-button" type="button" onClick={closeEditModal} disabled={isSaving}>
                {t("Cancel")}
              </button>
              <button className="primary-button" type="submit" disabled={isLoading || isSaving}>
                {identityFile ? <Upload size={18} /> : <Save size={18} />}
                {t(isSaving ? "Saving profile" : "Save profile")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
