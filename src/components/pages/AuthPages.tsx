import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, ClipboardCheck, LockKeyhole } from "lucide-react";
import { adminLoginName, roleHomePath, roleOptions, serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, RegisteredAccount, RegistrationRole, Role } from "../../types";
import { makeRegistrationId, roleCanOpenPath } from "./pageHelpers";

export function LoginPage({
  onLogin,
  registrations,
  user,
}: {
  onLogin: (nextUser: AuthUser, nextPath: string) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const params = new URLSearchParams(location.search);
  const queryRole = params.get("role");
  const safeQueryRole = roleOptions.some((option) => option.role === queryRole) ? (queryRole as Role) : "buyer";
  const queryNext = params.get("next") ?? roleHomePath[safeQueryRole];
  const safeNext = queryNext.startsWith("/") && !queryNext.startsWith("//") ? queryNext : roleHomePath[safeQueryRole];
  const [role, setRole] = useState<Role>(safeQueryRole);
  const [name, setName] = useState(user?.role === safeQueryRole ? user.name : "");
  const [phone, setPhone] = useState(user?.role === safeQueryRole ? user.phone : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError(t("Please enter your name."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (password.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    if (role === "admin" && cleanName !== adminLoginName) {
      setError(t("Admin name must be admin_amarkrishok."));
      return;
    }

    if (role !== "admin") {
      const account = registrations.find((item) => item.role === role && item.phone === cleanPhone);

      if (!account) {
        setError(t("Account not found. Please register first."));
        return;
      }

      if (account.status === "pending") {
        setError(t("Account is waiting for admin verification."));
        return;
      }

      if (account.status === "rejected") {
        setError(t("Registration was not approved. Please contact admin."));
        return;
      }

      if (account.password !== password) {
        setError(t("Password does not match."));
        return;
      }

      const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
      onLogin({ accountId: account.id, name: account.name, phone: account.phone, role, signedInAt: new Date().toISOString() }, nextPath);
      return;
    }

    const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
    onLogin({ name: cleanName, phone: cleanPhone, role, signedInAt: new Date().toISOString() }, nextPath);
  };

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitLogin}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("Secure login")}</span>
        <h1>{t("Login to continue")}</h1>
        <p>{t("Choose your role and sign in to access protected AmarKrishok tools.")}</p>

        <label className="input-field">
          <span>{t("Role")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {roleOptions.map((option) => (
              <option key={option.role} value={option.role}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </label>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={role === "admin" ? t("Full name") : t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
          <small>{t("Use any 4+ character PIN for this prototype.")}</small>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          {role !== "admin" && (
            <NavLink className="secondary-button" to={`/register/${role}`}>
              {t("Register")}
            </NavLink>
          )}
          <button className="primary-button" type="submit">
            <LockKeyhole size={17} />
            {t("Sign in")}
          </button>
        </div>
      </form>
    </section>
  );
}

export function RegisterPage({
  onRegister,
  registrations,
  role,
}: {
  onRegister: (account: RegisteredAccount) => void;
  registrations: RegisteredAccount[];
  role: RegistrationRole;
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;
  const [submittedAccount, setSubmittedAccount] = useState<RegisteredAccount | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [identity, setIdentity] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const title = role === "buyer" ? "Create buyer account" : "Create seller account";

  const submitRegistration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanOrganization = organization.trim();
    const cleanDistrict = district.trim();
    const cleanAddress = address.trim();
    const cleanIdentity = identity.trim();
    const cleanFocus = focus.trim();

    if (!cleanName || !cleanPhone || !cleanPassword || !cleanOrganization || !cleanDistrict || !cleanAddress || !cleanIdentity || !cleanFocus) {
      setError(t("Please fill in all registration fields."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (cleanPassword.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    const existingAccount = registrations.find((account) => account.role === role && account.phone === cleanPhone && account.status !== "rejected");
    if (existingAccount) {
      setError(t("An account with this role and phone already exists."));
      return;
    }

    const nextAccount: RegisteredAccount = {
      id: makeRegistrationId(role),
      role,
      status: "pending",
      name: cleanName,
      phone: cleanPhone,
      password: cleanPassword,
      organization: cleanOrganization,
      district: cleanDistrict,
      address: cleanAddress,
      identity: cleanIdentity,
      focus: cleanFocus,
      submittedAt: new Date().toISOString(),
    };

    onRegister(nextAccount);
    setSubmittedAccount(nextAccount);
    setError("");
  };

  if (submittedAccount) {
    return (
      <section className="page-wrap auth-layout">
        <div className="panel auth-panel">
          <div className="auth-icon">
            <CheckCircle2 size={28} />
          </div>
          <span>{t("Registration submitted")}</span>
          <h1>{t("Registration submitted")}</h1>
          <div className="auth-notice pending">
            <Clock3 size={20} />
            <div>
              <strong>{t("Pending verification")}</strong>
              <p>{t("Your account is pending admin verification. You can sign in after approval.")}</p>
            </div>
          </div>
          <div className="registration-summary">
            <span>{t(roleOption.label)}</span>
            <strong>{submittedAccount.name}</strong>
            <small>{submittedAccount.phone}</small>
          </div>
          <div className="auth-actions">
            <NavLink className="secondary-button" to="/">
              {t("Go home")}
            </NavLink>
            <NavLink className="primary-button" to={`/login?role=${role}&next=${encodeURIComponent(roleHomePath[role])}`}>
              {t("Back to login")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitRegistration}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("New registration")}</span>
        <h1>{t(title)}</h1>
        <p>{t("Submit your information. Admin will verify it before your account becomes active.")}</p>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
        </label>
        <label className="input-field">
          <span>{t("Business / farm name")}</span>
          <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
        </label>
        <label className="input-field">
          <span>{t("District")}</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="" disabled>
              {t("Select service district")}
            </option>
            {serviceDistricts.map((serviceDistrict) => (
              <option key={serviceDistrict} value={serviceDistrict}>
                {t(serviceDistrict)}
              </option>
            ))}
          </select>
        </label>
        <label className="input-field">
          <span>{t("Address")}</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        <label className="input-field">
          <span>{t("NID / trade license")}</span>
          <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={t("Sample identity")} />
        </label>
        <label className="input-field">
          <span>{t("Crop interest / supply focus")}</span>
          <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          <button className="primary-button" type="submit">
            <ClipboardCheck size={17} />
            {t("Submit registration")}
          </button>
        </div>
      </form>
    </section>
  );
}
