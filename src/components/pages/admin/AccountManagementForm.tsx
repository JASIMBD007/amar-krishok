import { useEffect, useState, type FormEvent } from "react";
import { Plus, Save } from "lucide-react";
import type { AdminAccountPayload } from "../../../api/auth";
import { serviceDistricts } from "../../../data";
import { useTranslate } from "../../../i18n";
import type { AccountStatus, RegisteredAccount, RegistrationRole } from "../../../types";
import { FormGrid } from "../../shared";

type AccountFormState = {
  address: string;
  district: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  status: AccountStatus;
};

const emptyForm: AccountFormState = {
  address: "",
  district: "",
  focus: "",
  identity: "",
  name: "",
  organization: "",
  password: "",
  phone: "",
  status: "active",
};

export function AccountManagementForm({
  editingAccount,
  onCreateAccount,
  onDone,
  onError,
  onUpdateAccount,
  role,
}: {
  editingAccount: RegisteredAccount | null;
  onCreateAccount: (payload: AdminAccountPayload) => Promise<void>;
  onDone: (message: string) => void;
  onError: (message: string) => void;
  onUpdateAccount: (id: string, payload: Partial<AdminAccountPayload>) => Promise<void>;
  role: RegistrationRole;
}) {
  const t = useTranslate();
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingAccount);

  useEffect(() => {
    if (!editingAccount) {
      setForm(emptyForm);
      return;
    }

    setForm({
      address: editingAccount.address,
      district: editingAccount.district,
      focus: editingAccount.focus,
      identity: editingAccount.identity,
      name: editingAccount.name,
      organization: editingAccount.organization,
      password: "",
      phone: editingAccount.phone,
      status: editingAccount.status,
    });
  }, [editingAccount]);

  const updateField = (field: keyof AccountFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.organization.trim() || !form.district.trim() || !form.address.trim() || !form.identity.trim() || !form.focus.trim()) {
      onError("Please fill in all account fields.");
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
          focus: form.focus.trim(),
          identity: form.identity.trim(),
          name: form.name.trim(),
          organization: form.organization.trim(),
          password: form.password || undefined,
          phone: form.phone.trim(),
          role,
          status: form.status,
        });
        onDone("Account updated.");
      } else {
        await onCreateAccount({
          address: form.address.trim(),
          district: form.district.trim(),
          focus: form.focus.trim(),
          identity: form.identity.trim(),
          name: form.name.trim(),
          organization: form.organization.trim(),
          password: form.password,
          phone: form.phone.trim(),
          role,
          status: form.status,
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
          <span>{t("Full name")}</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} inputMode="tel" placeholder="01700000000" />
        </label>
        <label className="input-field">
          <span>{t("Password")}</span>
          <input value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder={t(isEditing ? "Leave blank to keep current password" : "Password")} type="password" />
        </label>
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
          <span>{t("Address")}</span>
          <input value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        <label className="input-field">
          <span>{t("NID / trade license")}</span>
          <input value={form.identity} onChange={(event) => updateField("identity", event.target.value)} placeholder={t("Sample identity")} />
        </label>
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
    </form>
  );
}
