import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, ClipboardCheck, Eye, EyeOff, LockKeyhole } from "lucide-react";
import {
  ApiRequestError,
  AuthRequestError,
  loginWithApi,
  requestAccountPasswordReset,
  registerAccountWithApi,
} from "../../api/auth";
import { RegisterChoiceModal } from "../RegisterChoiceModal";
import { getUpazillasForDistrict, roleHomePath, roleOptions, serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, RegisteredAccount, RegistrationRole, Role } from "../../types";
import { roleCanOpenPath } from "./pageHelpers";

const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;
const loginAccountOrder: Role[] = ["admin", "farmer", "buyer"];

function loginRoleFromQuery(role: string | null): Role | "" {
  return role === "admin" || role === "farmer" || role === "buyer" ? role : "";
}

function PasswordField({
  hint,
  label = "Password",
  onChange,
  placeholder,
  required,
  value,
}: {
  hint?: string;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const t = useTranslate();
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <label className="input-field">
      <span>
        {t(label)}
        {required && <strong className="required-mark"> *</strong>}
      </span>
      <div className="password-control">
        <input value={value} onChange={(event) => onChange(event.target.value)} type={visible ? "text" : "password"} placeholder={placeholder ?? t("Password")} />
        <button className="password-toggle" type="button" aria-label={t(toggleLabel)} aria-pressed={visible} title={t(toggleLabel)} onClick={() => setVisible((current) => !current)}>
          <ToggleIcon size={18} />
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

/**
 * Why the visitor was sent to the login page. The gated destination is remembered in `next`, so the
 * banner explains the redirect instead of leaving it looking like a dead end.
 */
function gateReasonFor(next: string) {
  if (next.startsWith("/farmer")) {
    return "Log in to reach your farmer desk, listings and payouts.";
  }

  if (next.startsWith("/checkout")) {
    return "Log in to pay into escrow. Nothing is charged until you confirm.";
  }

  if (next.startsWith("/orders")) {
    return "Log in to see your orders and escrow balances.";
  }

  if (next.startsWith("/buyer")) {
    return "Log in to reach your buyer workspace.";
  }

  if (next.startsWith("/admin")) {
    return "Staff sign-in. Every action you take is written to the audit log.";
  }

  return "";
}

export function LoginPage({
  onLogin,
  user,
}: {
  onLogin: (nextUser: AuthUser, nextPath: string) => void;
  user: AuthUser | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslate();
  const params = new URLSearchParams(location.search);
  const queryNext = params.get("next") ?? "";
  const safeNext = queryNext.startsWith("/") && !queryNext.startsWith("//") ? queryNext : "";
  const [accountType, setAccountType] = useState<Role | "">(loginRoleFromQuery(params.get("role")) || user?.role || "");
  const [identifier, setIdentifier] = useState(user?.role === "admin" ? user.username : user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "reset">("login");
  const [resetRole, setResetRole] = useState<RegistrationRole>(accountType === "farmer" || accountType === "buyer" ? accountType : "buyer");
  const [resetPhone, setResetPhone] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [isRegisterChoiceOpen, setIsRegisterChoiceOpen] = useState(false);
  const credentialLabel = accountType === "admin" ? "Username" : "Mobile";
  const credentialPlaceholder = accountType === "admin" ? "Account username" : "Your mobile number";
  const gateReason = gateReasonFor(safeNext);

  const chooseRegistration = (role: RegistrationRole) => {
    setIsRegisterChoiceOpen(false);
    navigate(role === "farmer" ? "/register/farmer" : "/register/buyer");
  };

  const openPasswordReset = () => {
    setAuthMode("reset");
    setResetRole(accountType === "farmer" || accountType === "buyer" ? accountType : "buyer");
    setResetPhone(accountType !== "admin" ? identifier : "");
    setResetPassword("");
    setResetPasswordConfirm("");
    setError("");
    setNotice("");
    setResetError("");
  };

  const submitPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPhone = resetPhone.trim();

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setResetError(t("Please enter a valid mobile number."));
      return;
    }

    setIsResetSubmitting(true);
    setResetError("");

    try {
      if (resetPassword.length < 4) {
        setResetError(t("Password must be at least 4 characters."));
        return;
      }

      if (resetPassword !== resetPasswordConfirm) {
        setResetError(t("Passwords do not match."));
        return;
      }

      await requestAccountPasswordReset({ password: resetPassword, phone: cleanPhone, role: resetRole });
      setAuthMode("login");
      setAccountType(resetRole);
      setIdentifier(cleanPhone);
      setPassword("");
      setNotice(t("Password reset request sent. Admin will review it before the password changes."));
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (apiError) {
      setResetError(t(apiError instanceof AuthRequestError ? apiError.message : "Password reset service is unavailable. Please try again."));
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanIdentifier = accountType === "admin" ? identifier.trim().toLowerCase() : identifier.trim();

    if (!accountType) {
      setError(t("Please select account type."));
      return;
    }

    if (accountType === "admin" && !usernamePattern.test(cleanIdentifier)) {
      setError(t("Please enter a valid username."));
      return;
    }

    if (accountType !== "admin" && cleanIdentifier.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (password.length < 4) {
      setError(t("Password must be at least 4 characters."));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const nextUser = await loginWithApi({ accountType, identifier: cleanIdentifier, password });
      const nextPath = safeNext && roleCanOpenPath(nextUser.role, safeNext) ? safeNext : roleHomePath[nextUser.role];
      onLogin(nextUser, nextPath);
    } catch (apiError) {
      setError(t(apiError instanceof AuthRequestError ? apiError.message : "Login service is unavailable. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authMode === "reset") {
    return (
      <section className="page-wrap auth-layout">
        <form className="panel auth-panel login-panel password-reset-panel" onSubmit={submitPasswordReset}>
          <h1>{t("Reset password")}</h1>
          <p className="login-intro">{t("Enter your mobile number and new password. Admin will approve the change before it becomes active.")}</p>

          <label className="input-field">
            <span>
              {t("Account type")}
              <strong className="required-mark"> *</strong>
            </span>
            <select
              className="login-select"
              value={resetRole}
              onChange={(event) => {
                setResetRole(event.target.value as RegistrationRole);
                setResetPassword("");
                setResetPasswordConfirm("");
                setResetError("");
              }}
            >
              {roleOptions
                .filter((option) => option.role === "farmer" || option.role === "buyer")
                .map((option) => (
                  <option key={option.role} value={option.role}>
                    {t(option.label)}
                  </option>
                ))}
            </select>
          </label>

          <label className="input-field">
            <span>
              {t("Mobile")}
              <strong className="required-mark"> *</strong>
            </span>
            <input
              autoComplete="tel"
              inputMode="tel"
              value={resetPhone}
              onChange={(event) => {
                setResetPhone(event.target.value);
                setResetPassword("");
                setResetPasswordConfirm("");
                setResetError("");
              }}
              placeholder={t("Your mobile number")}
            />
          </label>

          <PasswordField label="New password" value={resetPassword} onChange={setResetPassword} placeholder={t("New password")} required />
          <PasswordField label="Confirm new password" value={resetPasswordConfirm} onChange={setResetPasswordConfirm} placeholder={t("Confirm new password")} required />

          {resetError && <p className="auth-error">{resetError}</p>}

          <button className="primary-button auth-submit-button" type="submit" disabled={isResetSubmitting}>
            <LockKeyhole size={17} />
            {t(isResetSubmitting ? "Submitting" : "Send reset request")}
          </button>

          <p className="auth-link-line">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setResetError("");
              }}
            >
              {t("Back to login")}
            </button>
          </p>
        </form>
      </section>
    );
  }

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel login-panel" onSubmit={submitLogin}>
        <h1>{t("Login to AmarKrishok")}</h1>
        <p className="login-intro">{t("To use AmarKrishok, please log in with your account details.")}</p>

        {/* Say why the user landed here. Being redirected without an explanation reads like a bug. */}
        {gateReason ? (
          <p className="login-gate-reason" role="status">
            <LockKeyhole aria-hidden="true" size={16} />
            {t(gateReason)}
          </p>
        ) : null}

        <label className="input-field">
          <span>
            {t("Account type")}
            <strong className="required-mark"> *</strong>
          </span>
          <select
            className="login-select"
            value={accountType}
            onChange={(event) => {
              const nextRole = event.target.value as Role | "";
              setAccountType(nextRole);
              setIdentifier("");
              setError("");
              setNotice("");
            }}
          >
            <option value="">{t("Select account type")}</option>
            {loginAccountOrder.map((role) => {
              const option = roleOptions.find((item) => item.role === role);
              return option ? (
                <option key={option.role} value={option.role}>
                  {t(option.label)}
                </option>
              ) : null;
            })}
          </select>
        </label>

        <label className="input-field">
          <span>
            {t(credentialLabel)}
            <strong className="required-mark"> *</strong>
          </span>
          <input
            autoComplete={accountType === "admin" ? "username" : "tel"}
            inputMode={accountType === "admin" ? undefined : "tel"}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={t(credentialPlaceholder)}
          />
        </label>
        <PasswordField value={password} onChange={setPassword} placeholder={t("Your password")} required />

        {error && <p className="auth-error">{error}</p>}
        {notice && <p className="auth-info">{notice}</p>}

        <button className="primary-button auth-submit-button" type="submit" disabled={isSubmitting}>
          <LockKeyhole size={17} />
          {t(isSubmitting ? "Signing in" : "Login")}
        </button>

        <p className="auth-link-line">
          {t("Forgot password?")}{" "}
          <button type="button" onClick={openPasswordReset}>
            {t("Reset")}
          </button>
        </p>

        <p className="auth-create-line">
          {t("Don't have an account?")}{" "}
          <button type="button" onClick={() => setIsRegisterChoiceOpen(true)}>
            {t("Create account")}
          </button>
        </p>

      </form>
      {isRegisterChoiceOpen && <RegisterChoiceModal onChoose={chooseRegistration} onClose={() => setIsRegisterChoiceOpen(false)} />}
    </section>
  );
}

export function RegisterPage({
  onRegister,
  role,
}: {
  onRegister: (account: RegisteredAccount) => void;
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
  const [upazilla, setUpazilla] = useState("");
  const [address, setAddress] = useState("");
  const [identity, setIdentity] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const title = role === "buyer" ? "Create buyer account" : "Create seller account";
  const availableUpazillas = getUpazillasForDistrict(district);

  const submitRegistration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanOrganization = organization.trim();
    const cleanDistrict = district.trim();
    const cleanUpazilla = upazilla.trim();
    const cleanAddress = address.trim();
    const cleanIdentity = identity.trim();
    const cleanFocus = focus.trim();

    if (!cleanName || !cleanPhone || !cleanPassword || !cleanOrganization || !cleanDistrict || !cleanUpazilla || !cleanAddress || !cleanIdentity || !cleanFocus) {
      setError(t("Please fill in all registration fields."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (cleanPassword.length < 4) {
      setError(t("Password must be at least 4 characters."));
      return;
    }

    setIsSubmitting(true);
    setError("");

    registerAccountWithApi({
      address: cleanAddress,
      district: cleanDistrict,
      upazilla: cleanUpazilla,
      focus: cleanFocus,
      identity: cleanIdentity,
      name: cleanName,
      organization: cleanOrganization,
      password: cleanPassword,
      phone: cleanPhone,
      role,
    })
      .then((nextAccount) => {
        onRegister(nextAccount);
        setSubmittedAccount(nextAccount);
      })
      .catch((apiError) => {
        setError(t(apiError instanceof ApiRequestError ? apiError.message : "Backend service is unavailable. Please try again."));
      })
      .finally(() => setIsSubmitting(false));
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
              {t("Home")}
            </NavLink>
            <NavLink className="primary-button" to={`/login?next=${encodeURIComponent(roleHomePath[role])}`}>
              {t("Back to login")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel register-panel" onSubmit={submitRegistration}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("New registration")}</span>
        <h1>{t(title)}</h1>

        <div className="registration-grid register-form-grid">
          <label className="input-field">
            <span>{t("Full name")}</span>
            <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Your full name")} />
          </label>
          <label className="input-field">
            <span>{t("Mobile number")}</span>
            <input autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
          </label>
          <PasswordField value={password} onChange={setPassword} />
          <label className="input-field">
            <span>{t("Business / farm name")}</span>
            <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t("Business or farm name")} />
          </label>
          <label className="input-field">
            <span>{t("NID / trade license")}</span>
            <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={t("NID or trade license number")} />
          </label>
          <label className="input-field">
            <span>{t("Crop interest / supply focus")}</span>
            <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t("Crops you buy or sell")} />
          </label>
          <label className="input-field">
            <span>{t("District")}</span>
            <select value={district} onChange={(event) => {
              setDistrict(event.target.value);
              setUpazilla("");
            }}>
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
            <span>{t("Upazilla")}</span>
            <select value={upazilla} onChange={(event) => setUpazilla(event.target.value)} disabled={!district}>
              <option value="" disabled>
                {t(district ? "Select upazilla" : "Select district first")}
              </option>
              {availableUpazillas.map((serviceUpazilla) => (
                <option key={serviceUpazilla} value={serviceUpazilla}>
                  {t(serviceUpazilla)}
                </option>
              ))}
            </select>
          </label>
          <label className="input-field registration-wide-field">
            <span>{t("Address")}</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t("Your address")} />
          </label>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Home")}
          </button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <ClipboardCheck size={17} />
            {t(isSubmitting ? "Submitting" : "Register")}
          </button>
        </div>
      </form>
    </section>
  );
}
