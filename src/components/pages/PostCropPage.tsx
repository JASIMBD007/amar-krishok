import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileImage,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  Pencil,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Sprout,
  Truck,
  Upload,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  createCropLot,
  fetchMyCropLots,
  updateCropLot,
  updateCropLotStatus,
  uploadFile,
  type BackendCropLot,
  type CreateCropLotPayload,
} from "../../api/auth";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { KpiCard, trendDataFromRecords } from "../KpiCard";
import { EmptyState, ListLoading } from "../EmptyState";
import { getUpazillasForDistrict, lots, serviceDistricts } from "../../data";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";
import { formatLocalizedDate, normalizeDateInput } from "../../utils/dateInput";
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

function fallbackImageForCrop(crop: string) {
  return lots.find((lot) => lot.crop.toLowerCase() === crop.toLowerCase())?.image ?? "/assets/crops/rice.png";
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

function lotToForm(lot: BackendCropLot): CropLotForm {
  const district = lot.district.name;
  // The lot's own upazilla may be empty (older lots stored it only on the farmer
  // profile). Fall back to the farmer's upazilla, but only when it is a valid
  // upazilla for this district so we never prefill a mismatched value.
  const farmerUpazilla = lot.farmer?.upazilla ?? "";
  const upazilla = lot.upazilla || (getUpazillasForDistrict(district).includes(farmerUpazilla) ? farmerUpazilla : "");
  return {
    crop: lot.crop.name,
    district,
    grade: lot.grade,
    harvestDate: lot.harvestDate ? lot.harvestDate.slice(0, 10) : "",
    notes: lot.notes ?? "",
    pricePerKg: String(numericValue(lot.pricePerKg) || ""),
    quantityKg: String(numericValue(lot.quantityKg) || ""),
    upazilla,
  };
}

function preserveFarmerLotStatus(lot: BackendCropLot): BackendCropLot {
  return lot;
}

export function PostCropPage({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedEditLotId = searchParams.get("editLot");
  const [backendLots, setBackendLots] = useState<BackendCropLot[]>([]);
  const [form, setForm] = useState<CropLotForm>(emptyForm);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [editingLot, setEditingLot] = useState<BackendCropLot | null>(null);
  const [editForm, setEditForm] = useState<CropLotForm>(emptyForm);
  const [editCropImageFile, setEditCropImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingLot, setIsUpdatingLot] = useState(false);
  const [statusUpdatingLotId, setStatusUpdatingLotId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const availableUpazillas = getUpazillasForDistrict(form.district);
  const availableEditUpazillas = getUpazillasForDistrict(editForm.district);
  const activeBackendLots = useMemo(() => backendLots.filter((lot) => lot.status.toUpperCase() === "ACTIVE"), [backendLots]);
  const totalQuantityKg = useMemo(() => activeBackendLots.reduce((total, lot) => total + numericValue(lot.quantityKg), 0), [activeBackendLots]);
  const averageAsk = useMemo(() => {
    if (!activeBackendLots.length) {
      return 0;
    }

    return Math.round(activeBackendLots.reduce((total, lot) => total + numericValue(lot.pricePerKg), 0) / activeBackendLots.length);
  }, [activeBackendLots]);
  const estimatedPayout = totalQuantityKg * averageAsk;
  const latestLot = backendLots[0];
  // Keep the chart honest: all trend points come from this farmer's backend records.
  const lotsPostedTrend = useMemo(() => trendDataFromRecords(backendLots.map((lot) => ({ date: lot.createdAt, value: 1 }))), [backendLots]);
  const quantityPostedTrend = useMemo(
    () => trendDataFromRecords(backendLots.map((lot) => ({ date: lot.createdAt, value: numericValue(lot.quantityKg) }))),
    [backendLots],
  );
  const averageAskTrend = useMemo(
    () => trendDataFromRecords(activeBackendLots.map((lot) => ({ date: lot.createdAt, value: numericValue(lot.pricePerKg) }))),
    [activeBackendLots],
  );
  const payoutTrend = useMemo(
    () => trendDataFromRecords(activeBackendLots.map((lot) => ({ date: lot.createdAt, value: numericValue(lot.quantityKg) * numericValue(lot.pricePerKg) }))),
    [activeBackendLots],
  );

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    setIsLoading(true);
    fetchMyCropLots(user.accessToken)
      .then((lots) => {
        setBackendLots(lots.map(preserveFarmerLotStatus));
        setError("");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load seller lots.");
      })
      .finally(() => setIsLoading(false));
  }, [user?.accessToken]);

  useEffect(() => {
    if (!requestedEditLotId || editingLot) {
      return;
    }

    const targetLot = backendLots.find((lot) => lot.id === requestedEditLotId);
    if (!targetLot) {
      return;
    }

    setEditingLot(targetLot);
    setEditForm(lotToForm(targetLot));
    setEditCropImageFile(null);
    setError("");
    setSuccess("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("editLot");
      return next;
    }, { replace: true });
  }, [backendLots, editingLot, requestedEditLotId, setSearchParams]);

  useEffect(() => {
    if (!snackbar) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSnackbar(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [snackbar]);

  const updateField = (field: keyof CropLotForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const updateEditField = (field: keyof CropLotForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buildLotPayload = (source: CropLotForm, imageUrl?: string): CreateCropLotPayload => ({
    crop: source.crop.trim(),
    district: source.district.trim(),
    grade: source.grade.trim(),
    harvestDate: normalizeDateInput(source.harvestDate) || undefined,
    imageUrl,
    notes: source.notes.trim() || undefined,
    pricePerKg: Number(source.pricePerKg),
    quantityKg: Number(source.quantityKg),
    upazilla: source.upazilla.trim(),
  });

  const validateLotForm = (source: CropLotForm) => {
    const quantityKg = Number(source.quantityKg);
    const pricePerKg = Number(source.pricePerKg);
    if (!source.crop.trim() || !source.district.trim() || !source.upazilla.trim() || !source.grade.trim() || !quantityKg || !pricePerKg) {
      return "Please fill in crop, district, upazilla, quantity, price, and grade.";
    }

    if (quantityKg <= 0 || pricePerKg <= 0) {
      return "Quantity and price must be greater than zero.";
    }

    return "";
  };

  const openEditLot = (lot: BackendCropLot) => {
    setEditingLot(lot);
    setEditForm(lotToForm(lot));
    setEditCropImageFile(null);
    setError("");
    setSuccess("");
  };

  const submitLot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken) {
      setError("Please sign in again to post a backend lot.");
      return;
    }
    const accessToken = user.accessToken;

    const validationError = validateLotForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPublishing(true);
    setError("");

    (async () => {
      const uploadedCropImage = cropImageFile ? await uploadFile(accessToken, cropImageFile, "crop-lot-image") : null;
      return createCropLot(accessToken, buildLotPayload(form, uploadedCropImage?.url));
    })()
      .then((lot) => {
        const normalizedLot = preserveFarmerLotStatus(lot);
        setBackendLots((current) => [normalizedLot, ...current]);
        setForm(emptyForm);
        setCropImageFile(null);
        setSnackbar("Published to the marketplace");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not publish crop lot.");
      })
      .finally(() => setIsPublishing(false));
  };

  const submitLotUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken || !editingLot) {
      setError("Please sign in again to update this lot.");
      return;
    }

    const validationError = validateLotForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUpdatingLot(true);
    setError("");

    (async () => {
      const uploadedCropImage = editCropImageFile ? await uploadFile(user.accessToken!, editCropImageFile, "crop-lot-image") : null;
      return updateCropLot(user.accessToken!, editingLot.id, buildLotPayload(editForm, uploadedCropImage?.url ?? editingLot.imageUrl ?? undefined));
    })()
      .then((lot) => {
        const normalizedLot = preserveFarmerLotStatus(lot);
        setBackendLots((current) => current.map((item) => (item.id === normalizedLot.id ? normalizedLot : item)));
        setEditingLot(null);
        setEditCropImageFile(null);
        setSuccess("Lot updated.");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not update crop lot.");
      })
      .finally(() => setIsUpdatingLot(false));
  };

  const toggleLotStatus = (lot: BackendCropLot) => {
    if (!user?.accessToken) {
      setError("Please sign in again to manage this lot.");
      return;
    }

    const nextStatus = lot.status.toUpperCase() === "ACTIVE" ? "CANCELLED" : "ACTIVE";
    setStatusUpdatingLotId(lot.id);
    setError("");
    setSuccess("");

    updateCropLotStatus(user.accessToken, lot.id, nextStatus)
      .then((updatedLot) => {
        const normalizedLot = preserveFarmerLotStatus(updatedLot);
        setBackendLots((current) => current.map((item) => (item.id === normalizedLot.id ? normalizedLot : item)));
        setSuccess(normalizedLot.status.toUpperCase() === "ACTIVE" ? "Lot activated." : "Lot deactivated.");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not update lot status.");
      })
      .finally(() => setStatusUpdatingLotId(null));
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

        <section className="stats-grid farmer-stats-grid kpi-grid" aria-label={t("Seller backend metrics")}>
          <KpiCard
            icon={PackageCheck}
            label={t("Active lots")}
            value={v(activeBackendLots.length)}
            detail={t("Ready for buyer requests")}
      trendData={lotsPostedTrend}
          />
          <KpiCard
            icon={Sprout}
            label={t("Listed quantity")}
            value={v(formatQuantity(totalQuantityKg))}
            detail={t("From your active lots")}
      trendData={quantityPostedTrend}
      trendColor="#4f9e6f"
          />
          <KpiCard
            icon={BadgeCheck}
            label={t("Average ask")}
      value={v(`৳${averageAsk}/kg`)}
      detail={t("Based on listed price")}
      trendData={averageAskTrend}
      trendColor="#d28a3b"
          />
          <KpiCard
            icon={WalletCards}
            label={t("Estimated payout")}
      value={v(formatMoney(estimatedPayout))}
      detail={t("After buyer confirmation")}
      trendData={payoutTrend}
      trendColor="#166b4a"
          />
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
                <div className="input-field upload-field">
                  <span>{t("Crop image")}</span>
                  <div className="file-picker-row">
                    <label className="file-picker-button">
                      <input className="hidden-file-input" accept="image/*" onChange={(event) => setCropImageFile(event.target.files?.[0] ?? null)} type="file" />
                      <FileImage size={16} />
                      {t("Choose file")}
                    </label>
                    <span className="file-picker-name">{cropImageFile?.name ?? t("No file chosen")}</span>
                  </div>
                  <em className="upload-note">
                    <FileImage size={16} />
                    {cropImageFile?.name ?? t("Choose crop image")}
                  </em>
                </div>
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
                  <h2>{t("Your crop lots")}</h2>
                  <p>{t("Track submitted and approved lots. Order changes stay read-only for farmers.")}</p>
                </div>
                <Sprout size={22} />
              </div>
              <div className="seller-lot-list">
                {isLoading && <ListLoading label={t("Loading your backend lots...")} />}
                {!isLoading && backendLots.length === 0 && (
                  <EmptyState
                    icon={Sprout}
                    title={t("No crop lots yet")}
                    hint={t("Post your first crop to start receiving buyer requests.")}
                    action={
                      <button className="primary-button" type="button" onClick={() => scrollToSection("publish-crop")}>
                        <Plus size={18} />
                        {t("Post a crop")}
                      </button>
                    }
                  />
                )}
                {backendLots.map((lot) => (
                  <article className="seller-lot-item" key={lot.id}>
                    <div>
                      <strong>{t(lot.crop.name)}</strong>
                      <span>{lot.upazilla ? `${t(lot.upazilla)}, ${t(lot.district.name)}` : t(lot.district.name)}</span>
                    </div>
                    <div>
                      <strong>{v(formatQuantity(lot.quantityKg))}</strong>
                      <span>{v(`৳${numericValue(lot.pricePerKg)}/kg`)}</span>
                    </div>
                    <div>
                      <strong>{t("Grade")} {t(lot.grade)}</strong>
                      <span>{formatLocalizedDate(lot.harvestDate, language, t("Ready date not set"))}</span>
                    </div>
                    <div className="seller-lot-image-cell">
                      <img
                        src={lot.imageUrl || fallbackImageForCrop(lot.crop.name)}
                        alt={`${t(lot.crop.name)} ${t("crop image")}`}
                        loading="lazy"
                      />
                    </div>
                    <div className="seller-lot-status-cell">
                      <em className={`lot-status-pill ${lot.status.toLowerCase()}`}>{t(lot.status)}</em>
                    </div>
                    <div className="seller-lot-actions">
                      <button className="secondary-button compact-action" type="button" onClick={() => openEditLot(lot)}>
                        <Pencil size={15} />
                        {t("Edit")}
                      </button>
                      <button
                        className={`secondary-button compact-action ${lot.status.toUpperCase() === "ACTIVE" ? "danger-button" : ""}`}
                        type="button"
                        disabled={statusUpdatingLotId === lot.id}
                        onClick={() => toggleLotStatus(lot)}
                      >
                        <Power size={15} />
                        {t(lot.status.toUpperCase() === "ACTIVE" ? "Deactivate" : "Activate")}
                      </button>
                    </div>
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
      {editingLot && (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-modal lot-edit-modal" role="dialog" aria-modal="true" aria-labelledby="farmer-edit-lot-title">
            <div className="admin-modal-header">
              <div>
                <span>{t("Edit lot")}</span>
                <h2 id="farmer-edit-lot-title">{t(editingLot.crop.name)}</h2>
              </div>
              <button className="icon-button close-button" type="button" aria-label={t("Close modal")} onClick={() => setEditingLot(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitLotUpdate}>
              <FormGrid>
                <label className="input-field">
                  <span>{t("Crop name")}</span>
                  <input value={editForm.crop} onChange={(event) => updateEditField("crop", event.target.value)} />
                </label>
                <label className="input-field">
                  <span>{t("District")}</span>
                  <select value={editForm.district} onChange={(event) => updateEditField("district", event.target.value)}>
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
                  <select value={editForm.upazilla} onChange={(event) => updateEditField("upazilla", event.target.value)} disabled={!editForm.district}>
                    <option value="" disabled>
                      {t(editForm.district ? "Select upazilla" : "Select district first")}
                    </option>
                    {availableEditUpazillas.map((upazilla) => (
                      <option key={upazilla} value={upazilla}>
                        {t(upazilla)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Quantity (kg)")}</span>
                  <input value={editForm.quantityKg} min="1" onChange={(event) => updateEditField("quantityKg", event.target.value)} type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Price per kg")}</span>
                  <input value={editForm.pricePerKg} min="1" onChange={(event) => updateEditField("pricePerKg", event.target.value)} type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Harvest date")}</span>
                  <input value={editForm.harvestDate} onChange={(event) => updateEditField("harvestDate", event.target.value)} type="date" />
                </label>
                <label className="input-field">
                  <span>{t("Grade")}</span>
                  <select value={editForm.grade} onChange={(event) => updateEditField("grade", event.target.value)}>
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
                <div className="input-field upload-field">
                  <span>{t("Crop image")}</span>
                  <div className="file-picker-row">
                    <label className="file-picker-button">
                      <input className="hidden-file-input" accept="image/*" onChange={(event) => setEditCropImageFile(event.target.files?.[0] ?? null)} type="file" />
                      <FileImage size={16} />
                      {t("Choose file")}
                    </label>
                    <span className="file-picker-name">{editCropImageFile?.name ?? (editingLot.imageUrl ? t("Existing image kept") : t("No file chosen"))}</span>
                  </div>
                </div>
              </FormGrid>
              <label className="full-field">
                <span>{t("Notes")}</span>
                <textarea value={editForm.notes} onChange={(event) => updateEditField("notes", event.target.value)} />
              </label>
              {error && <p className="auth-error">{t(error)}</p>}
              {success && <p className="auth-notice">{t(success)}</p>}
              <div className="modal-action-row">
                <button className="secondary-button" type="button" onClick={() => setEditingLot(null)} disabled={isUpdatingLot}>
                  {t("Cancel")}
                </button>
                <button className="primary-button" type="submit" disabled={isUpdatingLot}>
                  <Save size={18} />
                  {t(isUpdatingLot ? "Saving" : "Save lot")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {snackbar && (
        <div className="snackbar" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{t(snackbar)}</span>
        </div>
      )}
    </section>
  );
}
