import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgeCheck, CheckCircle2, Clock3, FileImage, PackageCheck, Plus, Sprout, Upload, UserRoundCheck } from "lucide-react";
import { ApiRequestError, createCropLot, fetchMyCropLots, uploadFile, type BackendCropLot } from "../../api/auth";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { ChatWidget } from "../chat/ChatWidget";
import { serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, ChatThread, RegisteredAccount } from "../../types";
import { FormGrid, SectionTitle } from "../shared";

type CropLotForm = {
  crop: string;
  district: string;
  grade: string;
  harvestDate: string;
  notes: string;
  pricePerKg: string;
  quantityKg: string;
};

const emptyForm: CropLotForm = {
  crop: "",
  district: "",
  grade: "",
  harvestDate: "",
  notes: "",
  pricePerKg: "",
  quantityKg: "",
};

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

function formatHarvestDate(value: string | null) {
  if (!value) {
    return "Ready date not set";
  }

  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function PostCropPage({
  chatThreads,
  onProfileSaved,
  onSendChatMessage,
  user,
}: {
  chatThreads: ChatThread[];
  onProfileSaved: (account: RegisteredAccount) => void;
  onSendChatMessage: (user: AuthUser, text: string, subject: string) => void;
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
  const totalQuantityKg = useMemo(() => backendLots.reduce((total, lot) => total + numericValue(lot.quantityKg), 0), [backendLots]);
  const averageAsk = useMemo(() => {
    if (!backendLots.length) {
      return 0;
    }

    return Math.round(backendLots.reduce((total, lot) => total + numericValue(lot.pricePerKg), 0) / backendLots.length);
  }, [backendLots]);

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
    setForm((current) => ({ ...current, [field]: value }));
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
    if (!form.crop.trim() || !form.district.trim() || !form.grade.trim() || !quantityKg || !pricePerKg) {
      setError("Please fill in crop, district, quantity, price, and grade.");
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
    <section className="page-wrap form-layout seller-dashboard">
      <SectionTitle eyebrow="Seller dashboard" title="Manage your crop lots, backend listings, and admin support from one place." t={t} />

      <section className="seller-overview" aria-label={t("Seller backend metrics")}>
        <article>
          <PackageCheck size={20} />
          <span>{t("Active backend lots")}</span>
          <strong>{v(backendLots.length)}</strong>
        </article>
        <article>
          <Sprout size={20} />
          <span>{t("Total listed quantity")}</span>
          <strong>{t(formatQuantity(totalQuantityKg))}</strong>
        </article>
        <article>
          <BadgeCheck size={20} />
          <span>{t("Average ask")}</span>
          <strong>{v(`৳${averageAsk}/kg`)}</strong>
        </article>
      </section>

      <form className="panel form-panel" onSubmit={submitLot}>
        <div className="backend-status-pill">
          <CheckCircle2 size={17} />
          {t("Backend connected")}
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
            <input value={form.grade} onChange={(event) => updateField("grade", event.target.value)} placeholder={t("A / B+ / C")} />
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
      <aside className="panel side-panel">
        <UserRoundCheck size={24} />
        <h3>{t("Farmer profile readiness")}</h3>
        <p>{t("Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.")}</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
          <span><CheckCircle2 size={18} /> {t("Farm location added")}</span>
          <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
        </div>
      </aside>

      <section className="panel seller-lots-panel">
        <div className="panel-header">
          <div>
            <span>{t("Backend lots")}</span>
            <h2>{t("Your published crop lots")}</h2>
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
                <span>{t(lot.district.name)}</span>
              </div>
              <div>
                <strong>{t(formatQuantity(lot.quantityKg))}</strong>
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

      <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />

      <ChatWidget
        chatThreads={chatThreads}
        subject="Crop approval and payout support"
        user={user}
        onSendMessage={onSendChatMessage}
      />
    </section>
  );
}
