import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  PhoneCall,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
} from "lucide-react";
import {
  ApiRequestError,
  AuthRequestError,
  loginWithApi,
  requestAccountPasswordReset,
  registerAccountWithApi,
} from "../../api/auth";
import { getUpazillasForDistrict, roleHomePath, serviceDistricts } from "../../data";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount, RegistrationRole, Role } from "../../types";
import { roleCanOpenPath } from "./pageHelpers";

const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;
const loginAccountOrder: Role[] = ["buyer", "farmer", "admin"];

function loginRoleFromQuery(role: string | null): Role | "" {
  return role === "admin" || role === "farmer" || role === "buyer" ? role : "";
}

function loginRoleFromIntent(next: string): Role | "" {
  if (next.startsWith("/farmer")) return "farmer";
  if (next.startsWith("/orders") || next.startsWith("/buyer") || next.startsWith("/checkout")) return "buyer";
  if (next.startsWith("/admin")) return "admin";
  return "";
}

function localBangladeshPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits.slice(3, 13);
  if (digits.startsWith("0")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

function apiBangladeshPhone(value: string) {
  const local = localBangladeshPhone(value);
  return local ? `0${local}` : "";
}

function PasswordField({
  autoComplete = "current-password",
  hint,
  label = "Password",
  onChange,
  placeholder,
  required,
  value,
}: {
  autoComplete?: "current-password" | "new-password";
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
    <label className="auth-field auth-password-field">
      <span>
        {t(label)}
        {required ? <strong className="required-mark"> *</strong> : null}
      </span>
      <div className="password-control">
        <input
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          placeholder={placeholder ?? t("Password")}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={t(toggleLabel)}
          aria-pressed={visible}
          title={t(toggleLabel)}
          onClick={() => setVisible((current) => !current)}
        >
          <ToggleIcon size={18} />
        </button>
      </div>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function PhoneField({
  label = "Mobile number",
  onChange,
  value,
}: {
  label?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const t = useTranslate();
  return (
    <label className="auth-field auth-phone-field">
      <span>{t(label)}</span>
      <div className="auth-phone-control">
        <span>+880</span>
        <input
          aria-label={t(label)}
          autoComplete="tel"
          inputMode="tel"
          maxLength={10}
          placeholder="1XXXXXXXXX"
          value={value}
          onChange={(event) => onChange(localBangladeshPhone(event.target.value))}
        />
      </div>
    </label>
  );
}

function AuthRoleSegments({
  accountType,
  onChange,
  roles = loginAccountOrder,
}: {
  accountType: Role;
  onChange: (role: Role) => void;
  roles?: Role[];
}) {
  const t = useTranslate();
  const labels: Record<Role, string> = { admin: "Staff", buyer: "Buyer", farmer: "Farmer" };

  return (
    <div className="auth-role-group">
      <span>{t("I am a")}</span>
      <div className="auth-role-segments">
        {roles.map((role) => (
          <button
            aria-pressed={accountType === role}
            className={`${accountType === role ? "on" : ""}${role === "admin" ? " staff" : ""}`}
            key={role}
            type="button"
            onClick={() => onChange(role)}
          >
            {t(labels[role])}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Explain gated redirects so the login page never reads like a dead end. */
function gateReasonFor(next: string) {
  if (next.startsWith("/farmer")) return "Log in to reach your farmer desk, listings and payouts.";
  if (next.startsWith("/checkout")) return "Log in to pay into escrow. Nothing is charged until you confirm.";
  if (next.startsWith("/orders")) return "Log in to see your orders and escrow balances.";
  if (next.startsWith("/buyer")) return "Log in to reach your buyer workspace.";
  if (next.startsWith("/admin")) return "Staff sign-in. Every action you take is written to the audit log.";
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
  const initialRole = loginRoleFromQuery(params.get("role")) || loginRoleFromIntent(safeNext) || user?.role || "buyer";
  const [accountType, setAccountType] = useState<Role>(initialRole);
  const [identifier, setIdentifier] = useState(
    initialRole === "admin" ? user?.username ?? "" : localBangladeshPhone(user?.phone ?? ""),
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "reset">("login");
  const [resetRole, setResetRole] = useState<RegistrationRole>(
    accountType === "farmer" || accountType === "buyer" ? accountType : "buyer",
  );
  const [resetPhone, setResetPhone] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const gateReason = gateReasonFor(safeNext);

  useEffect(() => {
    setAccountType(initialRole);
  }, [initialRole]);

  const openPasswordReset = () => {
    setAuthMode("reset");
    setResetRole(accountType === "farmer" || accountType === "buyer" ? accountType : "buyer");
    setResetPhone(accountType === "admin" ? "" : localBangladeshPhone(identifier));
    setResetPassword("");
    setResetPasswordConfirm("");
    setError("");
    setNotice("");
    setResetError("");
  };

  const submitPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPhone = apiBangladeshPhone(resetPhone);

    if (resetPhone.length !== 10) {
      setResetError(t("Please enter a valid mobile number."));
      return;
    }
    if (resetPassword.length < 4) {
      setResetError(t("Password must be at least 4 characters."));
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetError(t("Passwords do not match."));
      return;
    }

    setIsResetSubmitting(true);
    setResetError("");
    try {
      await requestAccountPasswordReset({ password: resetPassword, phone: cleanPhone, role: resetRole });
      setAuthMode("login");
      setAccountType(resetRole);
      setIdentifier(resetPhone);
      setPassword("");
      setNotice(t("Password reset request sent. Admin will review it before the password changes."));
    } catch (apiError) {
      setResetError(
        t(apiError instanceof AuthRequestError ? apiError.message : "Password reset service is unavailable. Please try again."),
      );
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanIdentifier = accountType === "admin" ? identifier.trim().toLowerCase() : apiBangladeshPhone(identifier);

    if (accountType === "admin" && !usernamePattern.test(cleanIdentifier)) {
      setError(t("Please enter a valid username."));
      return;
    }
    if (accountType !== "admin" && identifier.length !== 10) {
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
      <section className="auth-login-page auth-reset-page">
        <div className="auth-login-copy">
          <h1>{t("Reset your password")}</h1>
          <p>{t("Enter your mobile number and new password. Admin will approve the change before it becomes active.")}</p>
          <div className="auth-benefit-list">
            <span><ShieldCheck aria-hidden="true" size={17} />{t("Your account stays protected during review")}</span>
            <span><PhoneCall aria-hidden="true" size={17} />{t("We notify you when the change is approved")}</span>
          </div>
        </div>

        <form className="auth-login-card" onSubmit={submitPasswordReset}>
          <AuthRoleSegments
            accountType={resetRole}
            roles={["buyer", "farmer"]}
            onChange={(role) => {
              setResetRole(role as RegistrationRole);
              setResetError("");
            }}
          />
          <PhoneField value={resetPhone} onChange={(value) => { setResetPhone(value); setResetError(""); }} />
          <PasswordField autoComplete="new-password" label="New password" value={resetPassword} onChange={setResetPassword} placeholder={t("New password")} required />
          <PasswordField autoComplete="new-password" label="Confirm new password" value={resetPasswordConfirm} onChange={setResetPasswordConfirm} placeholder={t("Confirm new password")} required />
          {resetError ? <p className="auth-error">{resetError}</p> : null}
          <button className="auth-primary-action" type="submit" disabled={isResetSubmitting}>
            {t(isResetSubmitting ? "Submitting" : "Send reset request")}
          </button>
          <p className="auth-card-link-line">
            <button type="button" onClick={() => { setAuthMode("login"); setResetError(""); }}>
              {t("Back to login")}
            </button>
          </p>
        </form>
      </section>
    );
  }

  return (
    <section className="auth-login-page">
      {/* Nothing above the form but its name. Someone here already intends to sign in; the sales
          copy and the benefit list only pushed the fields below the fold on a phone. */}
      <div className="auth-login-copy">
        <h1>{t("Log in with your phone number")}</h1>
      </div>

      <form className="auth-login-card" onSubmit={submitLogin}>
        {gateReason ? <p className="auth-intent-note" role="status">{t(gateReason)}</p> : null}
        <AuthRoleSegments
          accountType={accountType}
          onChange={(role) => {
            setAccountType(role);
            setIdentifier("");
            setError("");
            setNotice("");
          }}
        />

        {accountType === "admin" ? (
          <label className="auth-field auth-staff-field">
            <span>{t("Staff ID")}</span>
            <input
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="AK-OPS-014"
            />
            <small>{t("Staff credentials are checked by the server. Every action is written to the audit log.")}</small>
          </label>
        ) : (
          <PhoneField value={identifier} onChange={(value) => { setIdentifier(value); setError(""); }} />
        )}

        <PasswordField value={password} onChange={setPassword} placeholder={t("Your password")} required />
        {error ? <p className="auth-error">{error}</p> : null}
        {notice ? <p className="auth-info">{notice}</p> : null}

        <button className="auth-primary-action" type="submit" disabled={isSubmitting}>
          <LockKeyhole aria-hidden="true" size={17} />
          {t(isSubmitting ? "Signing in" : "Login")}
        </button>
        <p className="auth-card-link-line">
          {t("Forgot password?")} <button type="button" onClick={openPasswordReset}>{t("Reset")}</button>
        </p>
        <p className="auth-card-link-line">
          {t("New here?")} <button type="button" onClick={() => navigate("/register/farmer")}>{t("Create an account")}</button>
        </p>
      </form>
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
  const [step, setStep] = useState(1);
  const [submittedAccount, setSubmittedAccount] = useState<RegisteredAccount | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [upazilla, setUpazilla] = useState("");
  const [address, setAddress] = useState("");
  const [identity, setIdentity] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableUpazillas = getUpazillasForDistrict(district);

  const cleanDetails = () => ({
    address: address.trim(),
    district: district.trim(),
    focus: focus.trim(),
    identity: identity.trim(),
    name: name.trim(),
    organization: organization.trim(),
    phone: apiBangladeshPhone(phone),
    upazilla: upazilla.trim(),
  });

  const validateDetails = () => {
    const details = cleanDetails();
    if (Object.values(details).some((value) => !value)) {
      setError(t("Please fill in all registration fields."));
      return false;
    }
    if (phone.length !== 10) {
      setError(t("Please enter a valid mobile number."));
      return false;
    }
    return true;
  };

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueFromDetails = () => {
    if (validateDetails()) moveToStep(3);
  };

  const submitRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateDetails()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (password.length < 4) {
      setError(t("Password must be at least 4 characters."));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t("Passwords do not match."));
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const nextAccount = await registerAccountWithApi({
        ...cleanDetails(),
        password: password.trim(),
        role,
      });
      onRegister(nextAccount);
      setSubmittedAccount(nextAccount);
    } catch (apiError) {
      setError(t(apiError instanceof ApiRequestError ? apiError.message : "Backend service is unavailable. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedAccount) {
    return (
      <section className="auth-submitted-page">
        <div className="auth-submitted-card">
          <span className="auth-submitted-icon"><CheckCircle2 size={28} /></span>
          <h1>{t("Registration submitted")}</h1>
          <div className="auth-notice pending">
            <Clock3 size={20} />
            <div>
              <strong>{t("Pending verification")}</strong>
              <p>{t("Your account is pending admin verification. You can sign in after approval.")}</p>
            </div>
          </div>
          <div className="registration-summary">
            <span>{t(role === "farmer" ? "Farmer" : "Buyer")}</span>
            <strong>{submittedAccount.name}</strong>
            <small>{submittedAccount.phone}</small>
          </div>
          <div className="auth-actions">
            <NavLink className="secondary-button" to="/">{t("Home")}</NavLink>
            <NavLink className="primary-button" to={`/login?next=${encodeURIComponent(roleHomePath[role])}`}>
              {t("Back to login")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  const roleCards = [
    {
      icon: Sprout,
      id: "farmer" as const,
      label: "I sell crops",
      sub: "Post harvests, see the district rate before pricing, get paid to bKash.",
    },
    {
      icon: ShoppingBasket,
      id: "buyer" as const,
      label: "I buy crops",
      sub: "Source lots directly from verified farms with escrow protection.",
    },
  ];

  return (
    <section className="auth-register-page">
      <div className="auth-register-heading">
        <h1>{t("Create your account")}</h1>
        <span>{t("Step")} {step} / 3</span>
      </div>
      <div className="auth-register-progress" aria-label={`${t("Step")} ${step} / 3`}>
        {[1, 2, 3].map((item) => <span className={item <= step ? "on" : ""} key={item} />)}
      </div>

      <form className="auth-register-card" onSubmit={submitRegistration}>
        {step === 1 ? (
          <>
            <h2>{t("How will you use AmarKrishok?")}</h2>
            <div className="auth-register-roles">
              {roleCards.map((item) => {
                const Icon = item.icon;
                const selected = role === item.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? "on" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/register/${item.id}`)}
                  >
                    <span className="auth-register-role-icon"><Icon size={20} /></span>
                    <span><strong>{t(item.label)}</strong><em>{t(item.sub)}</em></span>
                  </button>
                );
              })}
            </div>
            <button className="auth-register-next" type="button" onClick={() => moveToStep(2)}>{t("Continue")}</button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2>{t("Your details")}</h2>
            <div className="auth-register-fields">
              <label className="auth-field">
                <span>{t("Full name")}</span>
                <input autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder={t("Your full name")} />
              </label>
              <PhoneField value={phone} onChange={(value) => { setPhone(value); setError(""); }} />
              <label className="auth-field">
                <span>{t("District")}</span>
                <select value={district} onChange={(event) => { setDistrict(event.target.value); setUpazilla(""); setError(""); }}>
                  <option value="" disabled>{t("Select service district")}</option>
                  {serviceDistricts.map((item) => <option key={item} value={item}>{t(item)}</option>)}
                </select>
              </label>
              <label className="auth-field">
                <span>{t("Upazilla")}</span>
                <select value={upazilla} onChange={(event) => { setUpazilla(event.target.value); setError(""); }} disabled={!district}>
                  <option value="" disabled>{t(district ? "Select upazilla" : "Select district first")}</option>
                  {availableUpazillas.map((item) => <option key={item} value={item}>{t(item)}</option>)}
                </select>
              </label>
              <label className="auth-field">
                <span>{t("Business / farm name")}</span>
                <input value={organization} onChange={(event) => { setOrganization(event.target.value); setError(""); }} placeholder={t("Business or farm name")} />
              </label>
              <label className="auth-field">
                <span>{t("NID / trade license")}</span>
                <input value={identity} onChange={(event) => { setIdentity(event.target.value); setError(""); }} placeholder={t("NID or trade license number")} />
              </label>
              <label className="auth-field">
                <span>{t("Crop interest / supply focus")}</span>
                <input value={focus} onChange={(event) => { setFocus(event.target.value); setError(""); }} placeholder={t("Crops you buy or sell")} />
              </label>
              <label className="auth-field auth-field-wide">
                <span>{t("Address")}</span>
                <input value={address} onChange={(event) => { setAddress(event.target.value); setError(""); }} placeholder={t("Your address")} />
              </label>
            </div>
            <div className="auth-register-info">
              <Info aria-hidden="true" size={17} />
              <span>{t(role === "farmer"
                ? "Farmer accounts are reviewed by staff before the verified badge appears on listings."
                : "Business buyers are reviewed by staff before account access is approved.")}</span>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <div className="auth-register-actions">
              <button className="back" type="button" onClick={() => moveToStep(1)}>{t("Back")}</button>
              <button className="next" type="button" onClick={continueFromDetails}>{t("Continue")}</button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="auth-register-step-heading">
              <h2>{t("Secure your account")}</h2>
              <p>{t("Create a password for server-verified sign-in. Staff permissions can only be granted by an existing administrator.")}</p>
            </div>
            <PasswordField autoComplete="new-password" value={password} onChange={(value) => { setPassword(value); setError(""); }} placeholder={t("Create password")} required />
            <PasswordField autoComplete="new-password" label="Confirm password" value={passwordConfirm} onChange={(value) => { setPasswordConfirm(value); setError(""); }} placeholder={t("Confirm password")} required />
            <div className="auth-review-box">
              <ShieldCheck aria-hidden="true" size={18} />
              <span>
                <strong>{name}</strong>
                {t(role === "farmer" ? "Farmer" : "Buyer")} · +880 {phone || "1XXXXXXXXX"} · {t(district)}
              </span>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <div className="auth-register-actions">
              <button className="back" type="button" onClick={() => moveToStep(2)}>{t("Back")}</button>
              <button className="finish" type="submit" disabled={isSubmitting}>{t(isSubmitting ? "Submitting" : "Create account")}</button>
            </div>
            <p className="auth-terms">{t("By creating an account you accept the marketplace terms and the escrow payment rules.")}</p>
          </>
        ) : null}
      </form>

      <p className="auth-register-login-line">
        {t("Already registered?")} <NavLink to="/login">{t("Log in instead")}</NavLink>
      </p>
    </section>
  );
}
