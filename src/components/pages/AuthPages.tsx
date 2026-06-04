import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AtSign, Building2, CheckCircle2, Clock3, ClipboardCheck, Eye, EyeOff, LockKeyhole, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { ApiRequestError, loginWithApi, AuthRequestError, registerAccountWithApi } from "../../api/auth";
import { getUpazillasForDistrict, roleHomePath, roleOptions, serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, RegisteredAccount, RegistrationRole } from "../../types";
import { roleCanOpenPath } from "./pageHelpers";

const usernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;

function PasswordField({
  hint,
  onChange,
  placeholder,
  value,
}: {
  hint?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const t = useTranslate();
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <label className="input-field">
      <span>{t("Password")}</span>
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
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!usernamePattern.test(cleanUsername)) {
      setError(t("Please enter a valid username."));
      return;
    }

    if (password.length < 4) {
      setError(t("Password must be at least 4 characters."));
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const nextUser = await loginWithApi({ password, username: cleanUsername });
      const nextPath = safeNext && roleCanOpenPath(nextUser.role, safeNext) ? safeNext : roleHomePath[nextUser.role];
      onLogin(nextUser, nextPath);
    } catch (apiError) {
      setError(t(apiError instanceof AuthRequestError ? apiError.message : "Login service is unavailable. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitLogin}>
        <div className="auth-icon">
          <ShieldCheck size={28} />
        </div>
        <span>{t("Secure login")}</span>
        <h1>{t("Login to continue")}</h1>
        <p>{t("Enter your username and password. AmarKrishok will open the right dashboard automatically.")}</p>

        <label className="input-field">
          <span>{t("Username")}</span>
          <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("Account username")} />
          <small>{t("Use the username created during registration.")}</small>
        </label>
        <PasswordField value={password} onChange={setPassword} placeholder={t("Password")} />

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          <NavLink className="secondary-button" to="/register/buyer">
            {t("Register buyer")}
          </NavLink>
          <NavLink className="secondary-button" to="/register/farmer">
            {t("Register seller")}
          </NavLink>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <LockKeyhole size={17} />
            {t(isSubmitting ? "Signing in" : "Sign in")}
          </button>
        </div>
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
  const v = useValueText();
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;
  const [submittedAccount, setSubmittedAccount] = useState<RegisteredAccount | null>(null);
  const [username, setUsername] = useState("");
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
    const cleanUsername = username.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanOrganization = organization.trim();
    const cleanDistrict = district.trim();
    const cleanUpazilla = upazilla.trim();
    const cleanAddress = address.trim();
    const cleanIdentity = identity.trim();
    const cleanFocus = focus.trim();

    if (!cleanUsername || !cleanName || !cleanPhone || !cleanPassword || !cleanOrganization || !cleanDistrict || !cleanUpazilla || !cleanAddress || !cleanIdentity || !cleanFocus) {
      setError(t("Please fill in all registration fields."));
      return;
    }

    if (!usernamePattern.test(cleanUsername)) {
      setError(t("Please enter a valid username."));
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
      username: cleanUsername,
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
            <small>{submittedAccount.username}</small>
          </div>
          <div className="auth-actions">
            <NavLink className="secondary-button" to="/">
              {t("Go home")}
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
        <p>{t("Create your username, add contact details, and submit your business or farm information for admin verification.")}</p>

        <div className="registration-sections">
          <section className="auth-form-section">
            <div className="auth-section-heading">
              <AtSign size={18} />
              <div>
                <strong>{t("Account access")}</strong>
                <span>{t("This username will be used for login.")}</span>
              </div>
            </div>
            <div className="registration-grid">
              <label className="input-field">
                <span>{t("Username")}</span>
                <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("Account username")} />
              </label>
              <PasswordField value={password} onChange={setPassword} />
            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-section-heading">
              <UserRound size={18} />
              <div>
                <strong>{t("Contact information")}</strong>
                <span>{t("Phone is for account contact, not login.")}</span>
              </div>
            </div>
            <div className="registration-grid">
              <label className="input-field">
                <span>{t("Full name")}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
              </label>
              <label className="input-field">
                <span>{t("Mobile number")}</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
              </label>
            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-section-heading">
              <Building2 size={18} />
              <div>
                <strong>{t(role === "buyer" ? "Buyer details" : "Farm details")}</strong>
                <span>{t("These details help admin verify your account faster.")}</span>
              </div>
            </div>
            <div className="registration-grid">
              <label className="input-field">
                <span>{t("Business / farm name")}</span>
                <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
              </label>
              <label className="input-field">
                <span>{t("NID / trade license")}</span>
                <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={t("Sample identity")} />
              </label>
              <label className="input-field">
                <span>{t("Crop interest / supply focus")}</span>
                <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
              </label>
            </div>
          </section>

          <section className="auth-form-section">
            <div className="auth-section-heading">
              <MapPin size={18} />
              <div>
                <strong>{t("Service location")}</strong>
                <span>{t("Choose the district and upazilla where you operate.")}</span>
              </div>
            </div>
            <div className="registration-grid">
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
                <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t("Dhaka North")} />
              </label>
            </div>
          </section>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <ClipboardCheck size={17} />
            {t(isSubmitting ? "Submitting" : "Submit registration")}
          </button>
        </div>
      </form>
    </section>
  );
}
