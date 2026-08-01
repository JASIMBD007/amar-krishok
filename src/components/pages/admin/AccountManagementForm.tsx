import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Eye, EyeOff, Plus, Save, X } from "lucide-react";
import { ApiRequestError, fetchUploadObjectUrl, isOwnUploadUrl, type AdminAccountPayload } from "../../../api/auth";
import { getUpazillasForDistrict, serviceDistricts } from "../../../data";
import { useTranslate } from "../../../i18n";
import type { AccountStatus, RegisteredAccount, RegistrationRole } from "../../../types";
import { FormGrid } from "../../shared";

type AccountFormState = {
  address: string;
  district: string;
  upazilla: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  status: AccountStatus;
  username: string;
};

const emptyForm: AccountFormState = {
  address: "",
  district: "",
  upazilla: "",
  focus: "",
  identity: "",
  name: "",
  organization: "",
  password: "",
  phone: "",
  status: "active",
  username: "",
};

// Only our own upload endpoint is ever rendered inline or opened automatically. "identity" is a free-text
// field, so an attacker-supplied external URL or data: URI must never be treated as a trusted document.
function canPreviewDocument(value: string) {
  return isOwnUploadUrl(value);
}

function isImageDocument(value: string, mimeType?: string) {
  if (mimeType) {
    return mimeType.startsWith("image/");
  }

  return /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?|#|$)/.test(value.trim().toLowerCase());
}

function identityKind(value: string) {
  const cleanValue = value.trim();
  if (!cleanValue) {
    return "empty";
  }

  return canPreviewDocument(cleanValue) ? "document" : "number";
}

export function AccountManagementForm({
  accessToken,
  editingAccount,
  onCreateAccount,
  onDone,
  onError,
  onUpdateAccount,
  role,
}: {
  accessToken?: string;
  editingAccount: RegisteredAccount | null;
  onCreateAccount: (payload: AdminAccountPayload) => Promise<void>;
  onDone: (message: string) => void;
  onError: (message: string) => void;
  onUpdateAccount: (id: string, payload: Partial<AdminAccountPayload>) => Promise<void>;
  role: RegistrationRole;
}) {
  const t = useTranslate();
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ mimeType: string; url: string } | null>(null);
  const [documentPreviewError, setDocumentPreviewError] = useState("");
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isEditing = Boolean(editingAccount);
  const currentIdentityKind = identityKind(form.identity);
  const showUploadedDocumentControls = isEditing && currentIdentityKind === "document";
  const hasPreviewableDocument = showUploadedDocumentControls && canPreviewDocument(form.identity);
  const availableUpazillas = getUpazillasForDistrict(form.district);
  const PasswordToggleIcon = isPasswordVisible ? EyeOff : Eye;
  const passwordToggleLabel = isPasswordVisible ? "Hide password" : "Show password";
  const readonlyPasswordValue = isPasswordVisible ? form.password || t("Password protected") : "••••••••";

  useEffect(() => {
    return () => {
      if (documentPreview) {
        URL.revokeObjectURL(documentPreview.url);
      }
    };
  }, [documentPreview]);

  const closeDocumentPreview = () => {
    setDocumentPreviewOpen(false);
    setDocumentPreviewError("");
    if (documentPreview) {
      URL.revokeObjectURL(documentPreview.url);
      setDocumentPreview(null);
    }
  };

  const openDocumentPreview = async () => {
    setDocumentPreviewOpen(true);
    setDocumentPreviewError("");

    if (!accessToken) {
      setDocumentPreviewError("Please sign in again to view this document.");
      return;
    }

    setDocumentPreviewLoading(true);
    try {
      const loaded = await fetchUploadObjectUrl(accessToken, form.identity);
      setDocumentPreview(loaded);
    } catch (previewError) {
      setDocumentPreviewError(previewError instanceof ApiRequestError ? previewError.message : "Could not load the document.");
    } finally {
      setDocumentPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!editingAccount) {
      setForm(emptyForm);
      closeDocumentPreview();
      setIsPasswordVisible(false);
      return;
    }

    closeDocumentPreview();
    setForm({
      address: editingAccount.address,
      district: editingAccount.district,
      upazilla: editingAccount.upazilla,
      focus: editingAccount.focus,
      identity: editingAccount.identity,
      name: editingAccount.name,
      organization: editingAccount.organization,
      password: "",
      phone: editingAccount.phone,
      status: editingAccount.status,
      username: editingAccount.username,
    });
    setDocumentPreviewOpen(false);
    setIsPasswordVisible(false);
  }, [editingAccount]);

  const updateField = (field: keyof AccountFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.username.trim() || !form.name.trim() || !form.phone.trim() || !form.organization.trim() || !form.district.trim() || !form.upazilla.trim() || !form.address.trim() || !form.identity.trim() || !form.focus.trim()) {
      onError("Please fill in all account fields.");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.username.trim())) {
      onError("Please enter a valid username.");
      return;
    }

    if (!isEditing && form.password.length < 4) {
      onError("Password must be at least 4 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingAccount) {
        await onUpdateAccount(editingAccount.id, {
          address: form.address.trim(),
          district: form.district.trim(),
          upazilla: form.upazilla.trim(),
          focus: form.focus.trim(),
          identity: form.identity.trim(),
          name: form.name.trim(),
          organization: form.organization.trim(),
          password: form.password || undefined,
          phone: form.phone.trim(),
          role,
          status: form.status,
          username: form.username.trim().toLowerCase(),
        });
        onDone("Account updated.");
      } else {
        await onCreateAccount({
          address: form.address.trim(),
          district: form.district.trim(),
          upazilla: form.upazilla.trim(),
          focus: form.focus.trim(),
          identity: form.identity.trim(),
          name: form.name.trim(),
          organization: form.organization.trim(),
          password: form.password,
          phone: form.phone.trim(),
          role,
          status: form.status,
          username: form.username.trim().toLowerCase(),
        });
        setForm(emptyForm);
        onDone("Account created.");
      }
    } catch (apiError) {
      onError(apiError instanceof Error ? apiError.message : "Account action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="account-management-form" onSubmit={submitForm}>
      <FormGrid>
        <label className="input-field">
          <span>{t("Username")}</span>
          <input value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder={t("Account username")} />
        </label>
        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} inputMode="tel" placeholder="01700000000" />
        </label>
        {isEditing ? (
          <label className="input-field">
            <span>{t("Password")}</span>
            <div className="password-control readonly-password-control">
              <input className="readonly-password-input" value={readonlyPasswordValue} readOnly aria-readonly="true" type="text" />
              <button className="password-toggle" type="button" aria-label={t(passwordToggleLabel)} aria-pressed={isPasswordVisible} title={t(passwordToggleLabel)} onClick={() => setIsPasswordVisible((current) => !current)}>
                <PasswordToggleIcon size={18} />
              </button>
            </div>
          </label>
        ) : (
          <label className="input-field">
            <span>{t("Password")}</span>
            <div className="password-control">
              <input value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder={t("Password")} type={isPasswordVisible ? "text" : "password"} />
              <button className="password-toggle" type="button" aria-label={t(passwordToggleLabel)} aria-pressed={isPasswordVisible} title={t(passwordToggleLabel)} onClick={() => setIsPasswordVisible((current) => !current)}>
                <PasswordToggleIcon size={18} />
              </button>
            </div>
          </label>
        )}
        <label className="input-field">
          <span>{t("Status")}</span>
          <select value={form.status} onChange={(event) => updateField("status", event.target.value as AccountStatus)}>
            <option value="active">{t("active")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="rejected">{t("rejected")}</option>
          </select>
        </label>
        <label className="input-field">
          <span>{t("Business / farm name")}</span>
          <input value={form.organization} onChange={(event) => updateField("organization", event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
        </label>
        <label className="input-field">
          <span>{t("District")}</span>
          <select value={form.district} onChange={(event) => updateField("district", event.target.value)}>
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
          <select value={form.upazilla} onChange={(event) => updateField("upazilla", event.target.value)} disabled={!form.district}>
            <option value="" disabled>
              {t(form.district ? "Select upazilla" : "Select district first")}
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
          <input value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        {showUploadedDocumentControls ? (
          <div className="input-field">
            <span>{t("NID / trade license")}</span>
            <div className="admin-document-button-row">
              <button className="secondary-button compact-action" type="button" onClick={openDocumentPreview}>
                <Eye size={15} />
                {t("View document")}
              </button>
            </div>
          </div>
        ) : (
          <label className="input-field">
            <span>{t(isEditing ? "NID / trade license number" : "NID / trade license")}</span>
            <input value={form.identity} onChange={(event) => updateField("identity", event.target.value)} placeholder={t("Sample identity")} />
          </label>
        )}
      </FormGrid>
      <label className="full-field">
        <span>{t("Crop interest / supply focus")}</span>
        <textarea value={form.focus} onChange={(event) => updateField("focus", event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
      </label>
      <div className="account-management-actions">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isEditing ? <Save size={17} /> : <Plus size={17} />}
          {t(isEditing ? "Update account" : "Create account")}
        </button>
      </div>
      {documentPreviewOpen && hasPreviewableDocument && (
        <div className="admin-modal-backdrop document-preview-backdrop" role="presentation">
          <section className="admin-modal document-preview-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
            <div className="admin-modal-header">
              <div>
                <span>{t("NID / trade license")}</span>
                <h2 id="document-preview-title">{t("Uploaded document preview")}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={closeDocumentPreview}>
                <X size={18} />
              </button>
            </div>
            <div className="document-preview-body">
              {documentPreviewLoading && <p>{t("Loading document...")}</p>}
              {!documentPreviewLoading && documentPreviewError && <p className="auth-error">{t(documentPreviewError)}</p>}
              {!documentPreviewLoading &&
                !documentPreviewError &&
                documentPreview &&
                (isImageDocument(documentPreview.url, documentPreview.mimeType) ? (
                  <img src={documentPreview.url} alt={t("Uploaded document preview")} />
                ) : (
                  <iframe src={documentPreview.url} sandbox="" title={t("Uploaded document preview")} />
                ))}
            </div>
            <div className="document-preview-actions">
              <p>{t("If the preview is blank, open the document in a new tab.")}</p>
              {documentPreview && (
                <a className="secondary-button compact-action" href={documentPreview.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  {t("Open document")}
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </form>
  );
}
