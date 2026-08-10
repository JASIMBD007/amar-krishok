import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ImageIcon, Leaf, Minus, Plus, X } from "lucide-react";
import {
  ApiRequestError,
  addCropLotPhoto,
  createCropLot,
  fetchMyProfile,
  uploadFile,
  type CreateCropLotPayload,
} from "../../api/auth";
import {
  MON_IN_KG,
  cropNamesBn,
  monToKg,
  perMonToPerKg,
  pickupOptions,
  taka,
} from "../../market/marketData";
import { useMarketStore } from "../../store/useMarketStore";
import { MarketCheckPanel } from "../market/MarketCheckPanel";
import { getUpazillasForDistrict, serviceDistricts } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser } from "../../types";

/** The demo shows four slots; the backend accepts six, so four is the safe on-screen count. */
const PHOTO_SLOTS = 4;

type PickupChoice = (typeof pickupOptions)[number];

type PendingPhoto = { file: File; preview: string };

/**
 * Post a crop — three steps, one card at a time, nothing else on the page.
 *
 * The farmer desk is the home screen now, so this route only has to answer three questions in
 * order: what, how much, and how does it leave the farm. Everything the old workspace carried
 * (listings, escrow, profile) lives on the desk, which is one click away via the back link.
 */
export function PostCropPage({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [crop, setCrop] = useState("");
  const [grade, setGrade] = useState("A");
  const [quantityMon, setQuantityMon] = useState(120);
  const [pricePerMon, setPricePerMon] = useState(0);
  const [district, setDistrict] = useState(user?.district ?? "");
  const [upazilla, setUpazilla] = useState("");
  const [pickup, setPickup] = useState<PickupChoice>(pickupOptions[0]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  // The crop cards are anchored on today's published rates. If rates have not loaded we still let
  // the farmer pick from the catalogue rather than showing an empty step.
  const cropChoices = useMemo(() => {
    const published = Object.keys(rates);
    return (published.length ? published : Object.keys(cropNamesBn)).slice(0, 6);
  }, [rates]);

  const districtRate = rates[crop] ?? 0;
  const pricePerKg = perMonToPerKg(pricePerMon);
  const availableUpazillas = getUpazillasForDistrict(district);
  // The farm's location comes from the profile. We only ask for it when the profile has not got it.
  const needsLocation = !district || !upazilla;

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    let active = true;
    fetchMyProfile(user.accessToken)
      .then((profile) => {
        if (!active) {
          return;
        }

        setDistrict((current) => current || profile.district || "");
        setUpazilla((current) => current || profile.upazilla || "");
      })
      .catch(() => {
        // A missing profile just means the location row stays visible on step 1.
      });

    return () => {
      active = false;
    };
  }, [user?.accessToken]);

  // Object URLs leak until revoked. The ref means the unmount cleanup sees the final list without
  // re-running — and revoking — every time a photo is added.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  /** Picking a crop seeds the ask with today's district rate, so the farmer starts from fair. */
  const chooseCrop = (name: string) => {
    setCrop(name);
    setError("");
    if (!pricePerMon && rates[name]) {
      setPricePerMon(rates[name]);
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const room = PHOTO_SLOTS - photos.length;
    const picked = Array.from(files)
      .slice(0, Math.max(0, room))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...picked]);
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      const target = current[index];
      if (target) {
        URL.revokeObjectURL(target.preview);
      }

      return current.filter((_, position) => position !== index);
    });
  };

  const goNext = () => {
    if (step === 1) {
      if (!crop) {
        setError("Please choose the crop you are selling.");
        return;
      }

      if (!district || !upazilla) {
        setError("Please fill in crop, grade, district and upazilla.");
        return;
      }
    }

    if (step === 2 && (quantityMon <= 0 || pricePerMon <= 0)) {
      setError("Quantity and price must be greater than zero.");
      return;
    }

    setError("");
    setStep((current) => Math.min(3, current + 1));
  };

  const publish = () => {
    const accessToken = user?.accessToken;
    if (!accessToken) {
      setError("Please sign in again to post a crop.");
      return;
    }

    setIsPublishing(true);
    setError("");

    (async () => {
      const uploaded: string[] = [];
      for (const photo of photos) {
        const result = await uploadFile(accessToken, photo.file, "crop-lot-image");
        uploaded.push(result.url);
      }

      const payload: CreateCropLotPayload = {
        crop,
        district,
        grade,
        imageUrl: uploaded[0],
        pickupWithin24h: pickup === "Within 24 h",
        pricePerKg,
        quantityKg: monToKg(quantityMon),
        // "Buyer collects" is the farmer opting out of arranging transport; the other two mean the
        // crop leaves the farm on the farmer's side.
        transportIncluded: pickup !== "Buyer collects",
        upazilla,
      };

      const lot = await createCropLot(accessToken, payload);
      // The gallery is a separate record per photo. The first one becomes the cover server-side.
      for (const url of uploaded) {
        await addCropLotPhoto(accessToken, lot.id, { url });
      }
    })()
      // Publishing ends on the marketplace, where the farmer can see the lot as buyers will.
      .then(() => navigate("/marketplace"))
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not publish crop lot.");
        setIsPublishing(false);
      });
  };

  return (
    <section className="post-crop-page">
      <button className="post-crop-back" type="button" onClick={() => navigate("/farmer")}>
        <ArrowLeft aria-hidden="true" size={18} />
        {t("Farmer desk")}
      </button>

      <div className="post-crop-head">
        <h1>{t("Post a crop")}</h1>
        <span className="post-crop-step-count mono-figure">
          {t("Step")} {v(step)} / {v(3)}
        </span>
      </div>

      <div className="post-crop-progress" role="group" aria-label={`${t("Step")} ${step} / 3`}>
        {[1, 2, 3].map((index) => (
          <span className={index <= step ? "on" : ""} key={index} />
        ))}
      </div>

      <div className="post-crop-card">
        {step === 1 ? (
          <>
            <h2>{t("What are you selling?")}</h2>
            <div className="crop-picker" role="radiogroup" aria-label={t("What are you selling?")}>
              {cropChoices.map((name) => (
                <button
                  aria-checked={crop === name}
                  className={crop === name ? "crop-pick on" : "crop-pick"}
                  key={name}
                  role="radio"
                  type="button"
                  onClick={() => chooseCrop(name)}
                >
                  <span className="crop-pick-tile" aria-hidden="true">
                    <Leaf size={19} />
                  </span>
                  <span>
                    <strong>{t(name)}</strong>
                    <small>
                      {cropNamesBn[name] ?? ""}
                      {rates[name] ? ` · ${t("rate")} ${v(taka(rates[name]))}` : ""}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            <div className="post-crop-field">
              <span className="post-crop-label">{t("Grade")}</span>
              <div className="filter-pill-group" role="radiogroup" aria-label={t("Grade")}>
                {["A", "B", "C"].map((option) => (
                  <button
                    aria-checked={grade === option}
                    className={grade === option ? "filter-pill on" : "filter-pill"}
                    key={option}
                    role="radio"
                    type="button"
                    onClick={() => setGrade(option)}
                  >
                    {t("Grade")} {v(option)}
                  </button>
                ))}
              </div>
            </div>

            {needsLocation ? (
              <div className="post-crop-location">
                <label className="post-crop-field">
                  <span className="post-crop-label">{t("District")}</span>
                  <select
                    value={district}
                    onChange={(event) => {
                      setDistrict(event.target.value);
                      setUpazilla("");
                    }}
                  >
                    <option value="" disabled>
                      {t("Select service district")}
                    </option>
                    {serviceDistricts.map((name) => (
                      <option key={name} value={name}>
                        {t(name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="post-crop-field">
                  <span className="post-crop-label">{t("Upazilla")}</span>
                  <select value={upazilla} disabled={!district} onChange={(event) => setUpazilla(event.target.value)}>
                    <option value="" disabled>
                      {t(district ? "Select upazilla" : "Select district first")}
                    </option>
                    {availableUpazillas.map((name) => (
                      <option key={name} value={name}>
                        {t(name)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {error ? <p className="auth-error">{t(error)}</p> : null}

            <div className="post-crop-actions">
              <button className="primary-button" type="button" onClick={goNext}>
                {t("Continue")}
              </button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2>{t("How much, and at what price?")}</h2>
            <div className="post-crop-price-row">
              <div className="post-crop-field">
                <span className="post-crop-label">{t("Quantity (mon)")}</span>
                <div className="qty-stepper">
                  <button
                    aria-label={t("Reduce quantity")}
                    type="button"
                    onClick={() => setQuantityMon((current) => Math.max(0, current - 10))}
                  >
                    <Minus aria-hidden="true" size={16} />
                  </button>
                  {/* The unit sits beside the field, so the box reads "120 mon" like the design
                      while the number itself stays typeable. Monospace makes the ch width exact. */}
                  <div className="qty-stepper-value">
                    <input
                      aria-label={t("Quantity (mon)")}
                      className="mono-figure"
                      min="1"
                      onChange={(event) => setQuantityMon(Math.max(0, Number(event.target.value) || 0))}
                      style={{ width: `${Math.max(1, String(quantityMon || "").length)}ch` }}
                      type="number"
                      value={quantityMon || ""}
                    />
                    <span>{t("mon")}</span>
                  </div>
                  <button aria-label={t("Increase quantity")} type="button" onClick={() => setQuantityMon((current) => current + 10)}>
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>
                <span className="post-crop-hint">
                  {v(monToKg(quantityMon).toLocaleString("en-US"))} {t("kg")} (1 {t("mon")} = {v(MON_IN_KG)} {t("kg")})
                </span>
              </div>

              <div className="post-crop-field">
                <span className="post-crop-label">{t("Your asking price / mon")}</span>
                <label className="price-input">
                  <span aria-hidden="true">৳</span>
                  <input
                    aria-label={t("Your asking price / mon")}
                    className="mono-figure"
                    min="1"
                    onChange={(event) => setPricePerMon(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={pricePerMon || ""}
                  />
                </label>
                <span className="post-crop-hint">
                  {districtRate
                    ? `${t("District rate today")} ${v(taka(districtRate))}`
                    : t("No published district rate for this crop yet.")}
                </span>
              </div>
            </div>

            <MarketCheckPanel crop={crop} district={district} pricePerKg={pricePerKg} />

            {error ? <p className="auth-error">{t(error)}</p> : null}

            <div className="post-crop-actions">
              <button className="secondary-button" type="button" onClick={() => setStep(1)}>
                {t("Back")}
              </button>
              <button className="primary-button" type="button" onClick={goNext}>
                {t("Continue")}
              </button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2>{t("Photos and pickup")}</h2>
            <input
              accept="image/*"
              className="hidden-file-input"
              multiple
              onChange={(event) => {
                addPhotos(event.target.files);
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <div className="post-crop-photos">
              {Array.from({ length: PHOTO_SLOTS }, (_, index) => {
                const photo = photos[index];
                if (photo) {
                  return (
                    <div className="post-crop-photo" key={photo.preview}>
                      <img alt={`${t(crop || "Crop")} ${v(index + 1)}`} src={photo.preview} />
                      <button aria-label={t("Remove photo")} type="button" onClick={() => removePhoto(index)}>
                        <X aria-hidden="true" size={14} />
                      </button>
                      {index === 0 ? <em>{t("Cover")}</em> : null}
                    </div>
                  );
                }

                const isNextSlot = index === photos.length;
                return (
                  <button
                    aria-label={t("Add photo")}
                    className="post-crop-photo empty"
                    key={`slot-${index}`}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isNextSlot ? <ImageIcon aria-hidden="true" size={22} /> : <Camera aria-hidden="true" size={22} />}
                  </button>
                );
              })}
            </div>

            <div className="post-crop-field">
              <span className="post-crop-label">{t("Pickup readiness")}</span>
              <div className="filter-pill-group" role="radiogroup" aria-label={t("Pickup readiness")}>
                {pickupOptions.map((option) => (
                  <button
                    aria-checked={pickup === option}
                    className={pickup === option ? "filter-pill on" : "filter-pill"}
                    key={option}
                    role="radio"
                    type="button"
                    onClick={() => setPickup(option)}
                  >
                    {t(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="post-crop-summary">
              <span className="filter-eyebrow">{t("Summary")}</span>
              <strong>
                {t(crop || "Your crop")} · {t("Grade")} {v(grade)} · {v(quantityMon)} {t("mon")}
              </strong>
              <span>
                {v(taka(pricePerMon))} / {t("mon")} · {t("total")} {v(taka(pricePerMon * quantityMon))} ·{" "}
                {t("pickup")} {t(pickup).toLowerCase()}
              </span>
            </div>

            {error ? <p className="auth-error">{t(error)}</p> : null}

            <div className="post-crop-actions">
              <button className="secondary-button" type="button" disabled={isPublishing} onClick={() => setStep(2)}>
                {t("Back")}
              </button>
              <button className="primary-button danger-button" type="button" disabled={isPublishing} onClick={publish}>
                {t(isPublishing ? "Publishing" : "Publish listing")}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
