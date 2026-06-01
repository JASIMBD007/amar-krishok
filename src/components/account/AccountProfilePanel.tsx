import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, Save, UserRoundCog } from "lucide-react";
import { ApiRequestError, fetchMyProfile, updateMyProfile, type UpdateProfilePayload } from "../../api/auth";
import { serviceDistricts } from "../../data";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { FormGrid } from "../shared";

const emptyProfile: UpdateProfilePayload = {
  address: "",
  district: "",
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canEditProfile = user?.role === "buyer" || user?.role === "farmer";

  useEffect(() => {
    if (!user?.accessToken || !canEditProfile) {
      return;
    }

    setIsLoading(true);
    fetchMyProfile(user.accessToken)
      .then((account) => {
        setProfile({
          address: account.address,
          district: account.district,
          focus: account.focus,
          identity: account.identity,
          name: account.name,
          organization: account.organization,
        });
        setError("");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load profile.");
      })
      .finally(() => setIsLoading(false));
  }, [canEditProfile, user?.accessToken]);

  const updateField = (field: keyof UpdateProfilePayload, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken || !canEditProfile) {
      setError("Only buyer and seller accounts can edit their own profile.");
      return;
    }

    if (!profile.name.trim() || !profile.organization.trim() || !profile.district.trim() || !profile.address.trim() || !profile.identity.trim() || !profile.focus.trim()) {
      setError("Please fill in all profile fields.");
      return;
    }

    setIsSaving(true);
    setError("");

    updateMyProfile(user.accessToken, {
      address: profile.address.trim(),
      district: profile.district.trim(),
      focus: profile.focus.trim(),
      identity: profile.identity.trim(),
      name: profile.name.trim(),
      organization: profile.organization.trim(),
    })
      .then((account) => {
        setProfile({
          address: account.address,
          district: account.district,
          focus: account.focus,
          identity: account.identity,
          name: account.name,
          organization: account.organization,
        });
        onProfileSaved(account);
        setSuccess("Profile updated.");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not update profile.");
      })
      .finally(() => setIsSaving(false));
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
    <form className="panel profile-panel" onSubmit={saveProfile}>
      <div className="panel-header">
        <div>
          <span>{t("My profile")}</span>
          <h2>{t("Edit account information")}</h2>
        </div>
        <UserRoundCog size={22} />
      </div>
      <p className="panel-copy">{t("You can update profile information. Orders and crop lot records stay read-only.")}</p>
      <FormGrid>
        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={profile.name} onChange={(event) => updateField("name", event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Business / farm name")}</span>
          <input value={profile.organization} onChange={(event) => updateField("organization", event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
        </label>
        <label className="input-field">
          <span>{t("District")}</span>
          <select value={profile.district} onChange={(event) => updateField("district", event.target.value)}>
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
          <input value={profile.address} onChange={(event) => updateField("address", event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        <label className="input-field">
          <span>{t("NID / trade license")}</span>
          <input value={profile.identity} onChange={(event) => updateField("identity", event.target.value)} placeholder={t("Sample identity")} />
        </label>
        <label className="input-field">
          <span>{t("Crop interest / supply focus")}</span>
          <input value={profile.focus} onChange={(event) => updateField("focus", event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
        </label>
      </FormGrid>
      {error && <p className="auth-error">{t(error)}</p>}
      {success && <p className="auth-notice">{t(success)}</p>}
      <button className="primary-button full" type="submit" disabled={isLoading || isSaving}>
        <Save size={18} />
        {t(isSaving ? "Saving profile" : "Save profile")}
      </button>
    </form>
  );
}
