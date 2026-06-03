import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileImage,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sprout,
  Truck,
  Upload,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { ApiRequestError, createCropLot, fetchMyCropLots, uploadFile, type BackendCropLot } from "../../api/auth";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { getUpazillasForDistrict, serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { FormGrid } from "../shared";

type CropLotForm = {
  crop: string;
  district: string;
  upazilla: string;
  grade: string;
  harvestDate: string;
  notes: string;
  pricePerKg: string;
  quantityKg: string;
};

const emptyForm: CropLotForm = {
  crop: "",
  district: "",
  upazilla: "",
  grade: "",
  harvestDate: "",
  notes: "",
  pricePerKg: "",
  quantityKg: "",
};

const farmerNavItems = [
  { id: "farmer-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "publish-crop", icon: Sprout, label: "Lots" },
  { id: "farmer-orders", icon: ClipboardList, label: "Orders" },
  { id: "farmer-payments", icon: WalletCards, label: "Payments" },
  { id: "farmer-profile", icon: UserRoundCheck, label: "Profile" },
];

function numericValue(value: string | number) {
  return Number(value);
}

function formatQuantity(value: string | number) {
  const kg = numericValue(value);
  if (!Number.isFinite(kg)) {
    return "0 kg";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${kg.toLocaleString("en-US")} kg`;
}

function formatMoney(value: number) {
  return `৳${Math.round(value).toLocaleString("en-US")}`;
}

function formatHarvestDate(value: string | null) {
  if (!value) {
    return "Ready date not set";
  }

  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function PostCropPage({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [backendLots, setBackendLots] = useState<BackendCropLot[]>([]);
  const [form, setForm] = useState<CropLotForm>(emptyForm);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const availableUpazillas = getUpazillasForDistrict(form.district);
  const totalQuantityKg = useMemo(() => backendLots.reduce((total, lot) => total + numericValue(lot.quantityKg), 0), [backendLots]);
  const averageAsk = useMemo(() => {
    if (!backendLots.length) {
      return 0;
    }

    return Math.round(backendLots.reduce((total, lot) => total + numericValue(lot.pricePerKg), 0) / backendLots.length);
  }, [backendLots]);
  const estimatedPayout = totalQuantityKg * averageAsk;
  const latestLot = backendLots[0];

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    setIsLoading(true);
    fetchMyCropLots(user.accessToken)
      .then((lots) => {
        setBackendLots(lots);
        setError("");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load seller lots.");
      })
      .finally(() => setIsLoading(false));
  }, [user?.accessToken]);

  const updateField = (field: keyof CropLotForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitLot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken) {
      setError("Please sign in again to post a backend lot.");
      return;
    }
    const accessToken = user.accessToken;

    const quantityKg = Number(form.quantityKg);
    const pricePerKg = Number(form.pricePerKg);
    if (!form.crop.trim() || !form.district.trim() || !form.upazilla.trim() || !form.grade.trim() || !quantityKg || !pricePerKg) {
      setError("Please fill in crop, district, upazilla, quantity, price, and grade.");
      return;
    }

    if (quantityKg <= 0 || pricePerKg <= 0) {
      setError("Quantity and price must be greater than zero.");
      return;
    }

    setIsPublishing(true);
    setError("");

    (async () => {
      const uploadedCropImage = cropImageFile ? await uploadFile(accessToken, cropImageFile, "crop-lot-image") : null;
      return createCropLot(accessToken, {
        crop: form.crop.trim(),
        district: form.district.trim(),
        grade: form.grade.trim(),
        harvestDate: form.harvestDate || undefined,
        imageUrl: uploadedCropImage?.url,
        notes: form.notes.trim() || undefined,
        pricePerKg,
        quantityKg,
        upazilla: form.upazilla.trim(),
      });
    })()
      .then((lot) => {
        setBackendLots((current) => [lot, ...current]);
        setForm(emptyForm);
        setCropImageFile(null);
        setSuccess("Published to backend.");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not publish crop lot.");
      })
      .finally(() => setIsPublishing(false));
  };

  return (
    <section className="dashboard-shell restored-dashboard farmer-dashboard-shell" id="farmer-dashboard">
      <aside className="sidebar farmer-sidebar">
        <div className="admin-brand">
          <LayoutDashboard size={25} />
          <div>
            <strong>{t("Farmer Control")}</strong>
            <small>{t("Crop command")}</small>
          </div>
        </div>
        <nav className="side-nav farmer-side-nav" aria-label={t("Farmer dashboard navigation")}>
          {farmerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={item.id === "farmer-dashboard" ? "active" : ""} key={item.id} onClick={() => scrollToSection(item.id)} type="button">
                <Icon size={19} />
                <span className="side-nav-label">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>
        <div className="trust-summary farmer-trust-summary">
          <ShieldCheck size={22} />
          <strong>{t("Payout protected")}</strong>
          <span>{t("Buyer payment is held safely until delivery and quality checks are confirmed.")}</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace farmer-dashboard-workspace">
        <header className="dashboard-topbar farmer-dashboard-topbar">
          <div className="page-title">
            <span>{t("Farmer workspace")}</span>
            <h1>{t("Crop operations dashboard")}</h1>
          </div>
          <div className="topbar-actions farmer-topbar-actions">
            <button className="secondary-button" onClick={() => scrollToSection("published-lots")} type="button">
              <ListChecks size={18} />
              {t("My lots")}
            </button>
            <button className="primary-button" onClick={() => scrollToSection("publish-crop")} type="button">
              <Plus size={18} />
              {t("Post crop")}
            </button>
          </div>
        </header>

        <section className="stats-grid farmer-stats-grid" aria-label={t("Seller backend metrics")}>
          <article className="panel stat-card dashboard-stat">
            <PackageCheck size={20} />
            <span>{t("Active lots")}</span>
            <strong>{v(backendLots.length)}</strong>
            <p>{t("Ready for buyer requests")}</p>
          </article>
          <article className="panel stat-card dashboard-stat">
            <Sprout size={20} />
            <span>{t("Listed quantity")}</span>
            <strong>{v(formatQuantity(totalQuantityKg))}</strong>
            <p>{t("From your active lots")}</p>
          </article>
          <article className="panel stat-card dashboard-stat">
            <BadgeCheck size={20} />
            <span>{t("Average ask")}</span>
            <strong>{v(`৳${averageAsk}/kg`)}</strong>
            <p>{t("Based on listed price")}</p>
          </article>
          <article className="panel stat-card dashboard-stat">
            <WalletCards size={20} />
            <span>{t("Estimated payout")}</span>
            <strong>{v(formatMoney(estimatedPayout))}</strong>
            <p>{t("After buyer confirmation")}</p>
          </article>
        </section>

        <section className="dashboard-grid farmer-dashboard-grid">
          <div className="farmer-main-column">
            <form className="panel form-panel farmer-form-panel" id="publish-crop" onSubmit={submitLot}>
              <div className="panel-header farmer-form-heading">
                <div>
                  <span>{t("Crop listing")}</span>
                  <h2>{t("Publish a crop lot")}</h2>
                  <p>{t("Keep the required fields short and accurate. You can add packaging or pickup details in notes.")}</p>
                </div>
              </div>
              <FormGrid>
                <label className="input-field">
                  <span>{t("Crop name")}</span>
                  <input value={form.crop} onChange={(event) => updateField("crop", event.target.value)} placeholder={t("Tomato")} />
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
                  <span>{t("Quantity (kg)")}</span>
                  <input value={form.quantityKg} min="1" onChange={(event) => updateField("quantityKg", event.target.value)} placeholder="1200" type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Price per kg")}</span>
                  <input value={form.pricePerKg} min="1" onChange={(event) => updateField("pricePerKg", event.target.value)} placeholder="34" type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Harvest date")}</span>
                  <input value={form.harvestDate} onChange={(event) => updateField("harvestDate", event.target.value)} type="date" />
                </label>
                <label className="input-field">
                  <span>{t("Grade")}</span>
                  <select value={form.grade} onChange={(event) => updateField("grade", event.target.value)}>
                    <option value="" disabled>
                      {t("Select grade")}
                    </option>
                    {["A", "B", "C"].map((grade) => (
                      <option key={grade} value={grade}>
                        {t(grade)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Crop image")}</span>
                  <input accept="image/*" onChange={(event) => setCropImageFile(event.target.files?.[0] ?? null)} type="file" />
                  <em className="upload-note">
                    <FileImage size={16} />
                    {cropImageFile?.name ?? t("Choose crop image")}
                  </em>
                </label>
              </FormGrid>
              <label className="full-field">
                <span>{t("Notes")}</span>
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={t("Packaging, pickup point, storage condition...")} />
              </label>
              {error && <p className="auth-error">{t(error)}</p>}
              {success && <p className="auth-notice">{t(success)}</p>}
              <button className="primary-button full" type="submit" disabled={isPublishing}>
                {cropImageFile ? <Upload size={18} /> : <Plus size={18} />}
                {t(isPublishing ? "Publishing" : "Publish crop lot")}
              </button>
            </form>

            <section className="panel seller-lots-panel farmer-lots-panel" id="published-lots">
              <div className="panel-header">
                <div>
                  <span>{t("Backend lots")}</span>
                  <h2>{t("Your published crop lots")}</h2>
                  <p>{t("Track the lots already sent to the marketplace. Order changes stay read-only for farmers.")}</p>
                </div>
                <Sprout size={22} />
              </div>
              <div className="seller-lot-list">
                {isLoading && <em>{t("Loading your backend lots...")}</em>}
                {!isLoading && backendLots.length === 0 && <em>{t("No backend lots posted yet.")}</em>}
                {backendLots.map((lot) => (
                  <article className="seller-lot-item" key={lot.id}>
                    <div>
                      <strong>{t(lot.crop.name)}</strong>
                      <span>{t(lot.upazilla || lot.district.name)}</span>
                    </div>
                    <div>
                      <strong>{v(formatQuantity(lot.quantityKg))}</strong>
                      <span>{v(`৳${numericValue(lot.pricePerKg)}/kg`)}</span>
                    </div>
                    <div>
                      <strong>{t("Grade")} {t(lot.grade)}</strong>
                      <span>{t(formatHarvestDate(lot.harvestDate))}</span>
                    </div>
                    <em>{t(lot.status)}</em>
                  </article>
                ))}
              </div>
            </section>

            <div id="farmer-profile">
              <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />
            </div>
          </div>

          <aside className="farmer-right-rail">
            <section className="panel farmer-rail-panel">
              <div className="farmer-rail-header">
                <UserRoundCheck size={22} />
                <div>
                  <span>{t("Profile")}</span>
                  <h3>{t("Profile readiness")}</h3>
                </div>
              </div>
              <p>{t("Keep profile and documents complete so the team can approve lots faster.")}</p>
              <div className="checklist compact">
                <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
                <span><CheckCircle2 size={18} /> {t("Farm location added")}</span>
                <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
              </div>
              <button className="secondary-button full" onClick={() => scrollToSection("farmer-profile")} type="button">
                <UserRoundCheck size={18} />
                {t("Open profile")}
              </button>
            </section>

            <section className="panel farmer-rail-panel" id="farmer-orders">
              <div className="farmer-rail-header">
                <ClipboardList size={22} />
                <div>
                  <span>{t("Orders")}</span>
                  <h3>{t("Buyer order updates")}</h3>
                </div>
              </div>
              <p>{t("Orders are managed by the team after buyers confirm supply. You can track them here without changing records.")}</p>
              <div className="farmer-mini-list">
                <span><Truck size={18} /> {t("Pickup requests will appear here")}</span>
                <span><ListChecks size={18} /> {t("Quality check status stays read-only")}</span>
              </div>
            </section>

            <section className="panel farmer-rail-panel" id="farmer-payments">
              <div className="farmer-rail-header">
                <WalletCards size={22} />
                <div>
                  <span>{t("Payments")}</span>
                  <h3>{t("Payment status")}</h3>
                </div>
              </div>
              <div className="release-amount farmer-payout-card">
                <span>{t("Estimated value")}</span>
                <strong>{v(formatMoney(estimatedPayout))}</strong>
              </div>
              <div className="farmer-mini-list">
                <span><CheckCircle2 size={18} /> {t("Escrow releases after confirmation")}</span>
                <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
              </div>
            </section>

            <section className="panel farmer-rail-panel">
              <div className="farmer-rail-header">
                <Sprout size={22} />
                <div>
                  <span>{t("Lots")}</span>
                  <h3>{t("Lot shortcuts")}</h3>
                </div>
              </div>
              {latestLot ? (
                <div className="farmer-latest-lot">
                  <strong>{t(latestLot.crop.name)}</strong>
                  <span>{t(latestLot.upazilla || latestLot.district.name)} · {v(formatQuantity(latestLot.quantityKg))}</span>
                  <em>{t(latestLot.status)}</em>
                </div>
              ) : (
                <p>{t("Post your first crop lot to start receiving buyer requests.")}</p>
              )}
              <button className="primary-button full" onClick={() => scrollToSection("publish-crop")} type="button">
                <Plus size={18} />
                {t("Post new crop")}
              </button>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
