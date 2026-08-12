import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ImageIcon, Trash2, Upload } from "lucide-react";
import {
  ApiRequestError,
  addCropLotPhoto,
  fetchMyCropLots,
  removeCropLotPhoto,
  updateCropLot,
  updateCropLotPhoto,
  updateCropLotStatus,
  uploadFile,
  type BackendCropLot,
} from "../../api/auth";
import { useTranslate, useValueText } from "../../i18n";
import {
  PLATFORM_FEE_LABEL,
  cropNamesBn,
  deltaVsRate,
  fairVerdict,
  kgToMon,
  monToKg,
  perKgToPerMon,
  perMonToPerKg,
  pickupOptions,
  taka,
} from "../../market/marketData";
import { useMarketStore } from "../../store/useMarketStore";
import type { AuthUser } from "../../types";
import { EmptyState, ListLoading } from "../EmptyState";

const MAX_PHOTOS = 6;
/** Below this a listing under-performs badly enough that the design calls it out. */
const HEALTHY_PHOTO_COUNT = 3;

function numericValue(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Edit a live listing. Changes reach buyers immediately, so the price check sits beside the form
 * rather than behind a save: the farmer sees where their ask lands before committing to it.
 */
export function EditListingPage({ user }: { user: AuthUser | null }) {
  const t = useTranslate();
  const v = useValueText();
  const { lotId } = useParams();
  const rates = useMarketStore((state) => state.rates);

  const [lot, setLot] = useState<BackendCropLot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);

  const [crop, setCrop] = useState("");
  const [grade, setGrade] = useState("A");
  const [quantityMon, setQuantityMon] = useState(0);
  const [pricePerMon, setPricePerMon] = useState(0);
  const [pickup, setPickup] = useState<string>(pickupOptions[0]);
  const [notes, setNotes] = useState("");

  const accessToken = user?.accessToken;

  const applyLot = useCallback((next: BackendCropLot) => {
    setLot(next);
    setCrop(next.crop.name);
    setGrade(next.grade.replace(/^Grade\s+/i, "") || "A");
    setQuantityMon(Math.round(kgToMon(numericValue(next.quantityKg))));
    setPricePerMon(perKgToPerMon(numericValue(next.pricePerKg)));
    setNotes(next.notes ?? "");
    // Pickup is stored as two booleans; the form shows the one label they add up to.
    setPickup(next.pickupWithin24h ? pickupOptions[0] : next.transportIncluded ? pickupOptions[1] : pickupOptions[2]);
  }, []);

  // The crop list is today's published rates, plus this lot's own crop in case its rate has lapsed.
  const cropChoices = useMemo(() => {
    const names = new Set(Object.keys(rates));
    if (crop) {
      names.add(crop);
    }

    return [...names];
  }, [crop, rates]);

  useEffect(() => {
    if (!accessToken || !lotId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    fetchMyCropLots(accessToken)
      .then((lots) => {
        if (!active) return;
        const match = lots.find((item) => item.id === lotId);
        if (match) {
          applyLot(match);
          setError("");
        } else {
          setError("This listing is not on your account.");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load this listing.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, applyLot, lotId]);

  if (isLoading) {
    return (
      <section className="edit-listing-page">
        <ListLoading label={t("Loading this listing...")} />
      </section>
    );
  }

  if (!lot) {
    return (
      <section className="edit-listing-page">
        <EmptyState
          icon={ImageIcon}
          title={t("Listing not found")}
          hint={t(error || "It may belong to another account.")}
          action={
            <Link className="primary-button" to="/farmer">
              {t("Back to desk")}
            </Link>
          }
        />
      </section>
    );
  }

  // The rate follows the field, not the saved record, so switching crop re-checks the price at once.
  const cropName = crop || lot.crop.name;
  const rate = rates[cropName];
  const delta = rate ? deltaVsRate(pricePerMon, rate) : 0;
  const verdict = fairVerdict(delta);
  const lotValue = pricePerMon * quantityMon;
  const photos = [...(lot.photos ?? [])].sort((first, second) => first.sortOrder - second.sortOrder);
  const isPaused = lot.status.toUpperCase() !== "ACTIVE";
  const localCropName = cropNamesBn[cropName] ? t(cropName) : cropName;

  const save = () => {
    if (!accessToken) return;
    setIsSaving(true);
    setError("");
    updateCropLot(accessToken, lot.id, {
      crop: cropName,
      grade,
      notes: notes.trim() || undefined,
      pickupWithin24h: pickup === pickupOptions[0],
      pricePerKg: perMonToPerKg(pricePerMon),
      quantityKg: monToKg(quantityMon),
      transportIncluded: pickup !== pickupOptions[2],
    })
      .then((updated) => {
        applyLot(updated);
        setNotice("Listing updated. Buyers see the change now.");
      })
      .catch((requestError) =>
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not save this listing."),
      )
      .finally(() => setIsSaving(false));
  };

  const togglePaused = () => {
    if (!accessToken) return;
    setIsSaving(true);
    updateCropLotStatus(accessToken, lot.id, isPaused ? "ACTIVE" : "CANCELLED")
      .then((updated) => {
        applyLot(updated);
        setNotice(isPaused ? "Listing is live again." : "Listing paused. Buyers no longer see it.");
      })
      .catch((requestError) =>
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not change the status."),
      )
      .finally(() => setIsSaving(false));
  };

  const addPhoto = (file: File) => {
    if (!accessToken) return;
    setBusyPhotoId("new");
    uploadFile(accessToken, file, "crop-lot-image")
      .then((uploaded) => addCropLotPhoto(accessToken, lot.id, { url: uploaded.url }))
      .then(applyLot)
      .catch((requestError) =>
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not add that photo."),
      )
      .finally(() => setBusyPhotoId(null));
  };

  const mutatePhoto = (photoId: string, run: () => Promise<BackendCropLot>) => {
    setBusyPhotoId(photoId);
    run()
      .then(applyLot)
      .catch((requestError) =>
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not update that photo."),
      )
      .finally(() => setBusyPhotoId(null));
  };

  /** Reordering swaps this photo's position with its neighbour, so the sequence stays contiguous. */
  const movePhoto = (index: number, direction: -1 | 1) => {
    if (!accessToken) return;
    const target = photos[index + direction];
    const current = photos[index];
    if (!target || !current) return;

    setBusyPhotoId(current.id);
    updateCropLotPhoto(accessToken, lot.id, current.id, { sortOrder: target.sortOrder })
      .then(() => updateCropLotPhoto(accessToken, lot.id, target.id, { sortOrder: current.sortOrder }))
      .then(applyLot)
      .catch((requestError) =>
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not reorder the photos."),
      )
      .finally(() => setBusyPhotoId(null));
  };

  return (
    <section className="edit-listing-page">
      <Link className="edit-listing-back" to="/farmer">
        <ArrowLeft aria-hidden="true" size={16} />
        {t("Farmer desk")}
      </Link>

      <div className="edit-listing-head">
        <div>
          <h1>{t("Edit listing")}</h1>
          <span>{t("Changes go live at once. Buyers watching this crop get an SMS if the price drops.")}</span>
        </div>
        <div className="edit-listing-actions">
          <button className="edit-secondary-button" disabled={isSaving} type="button" onClick={togglePaused}>
            {t(isPaused ? "Resume listing" : "Pause listing")}
          </button>
          <button className="edit-primary-button" disabled={isSaving} type="button" onClick={save}>
            {t(isSaving ? "Saving" : "Save & publish")}
          </button>
        </div>
      </div>

      {error ? <p className="soft-notice warn">{t(error)}</p> : null}
      {notice ? (
        <p className="edit-listing-saved" role="status">
          <Check aria-hidden="true" size={17} />
          {t(notice)}
        </p>
      ) : null}

      <div className="edit-listing-layout">
        <div className="edit-listing-main">
          <div className="edit-listing-card">
            <h2>{t("Crop & price")}</h2>
            <div className="edit-listing-grid">
              <label className="input-field">
                <span>{t("Crop")}</span>
                <select value={cropName} onChange={(event) => setCrop(event.target.value)}>
                  {cropChoices.map((option) => (
                    <option key={option} value={option}>
                      {t(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span>{t("Grade")}</span>
                <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                  {["A", "B", "C"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span>{t("Quantity (mon)")}</span>
                <input
                  min={1}
                  onChange={(event) => setQuantityMon(Number(event.target.value) || 0)}
                  type="number"
                  value={quantityMon || ""}
                />
              </label>
              <label className="input-field">
                <span>{t("Ask ৳ / mon")}</span>
                <input
                  min={1}
                  onChange={(event) => setPricePerMon(Number(event.target.value) || 0)}
                  type="number"
                  value={pricePerMon || ""}
                />
              </label>
              <label className="input-field">
                <span>{t("Pickup")}</span>
                <select value={pickup} onChange={(event) => setPickup(event.target.value)}>
                  {pickupOptions.map((option) => (
                    <option key={option} value={option}>
                      {t(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="full-field">
              <span>{t("Notes for buyers")}</span>
              <textarea onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
            </label>
          </div>

          <div className="edit-listing-card">
            <div className="edit-photos-head">
              <h2>{t("Photos")}</h2>
              <span className="mono-figure">
                {v(photos.length)} {t("of")} {v(MAX_PHOTOS)} {t("photos")}
              </span>
              {photos.length < MAX_PHOTOS ? (
                <label className="photo-add-button">
                  <input
                    accept="image/*"
                    className="hidden-file-input"
                    disabled={busyPhotoId !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) addPhoto(file);
                      event.target.value = "";
                    }}
                    type="file"
                  />
                  <Upload aria-hidden="true" size={15} />
                  {t("Add photo")}
                </label>
              ) : null}
            </div>

            {photos.length < HEALTHY_PHOTO_COUNT ? (
              <p className="photo-warning">
                <AlertTriangle aria-hidden="true" size={16} />
                {t("Lots with three or more photos sell about 30 % faster.")}
              </p>
            ) : null}

            {photos.length === 0 ? null : (
              <div className="photo-grid">
                {photos.map((photo, index) => (
                  <figure className="photo-tile" key={photo.id}>
                    <span className="photo-thumb">
                      {photo.url ? <img alt={photo.caption ?? cropName} src={photo.url} /> : <ImageIcon size={26} />}
                      <span className="photo-index mono-figure">{v(index + 1)}</span>
                      {photo.isCover ? <span className="photo-cover-badge">{t("Cover")}</span> : null}
                    </span>
                    <figcaption>{photo.caption ?? `${localCropName} ${v(index + 1)}`}</figcaption>
                    <div className="photo-actions">
                      <button
                        aria-label={t("Move earlier")}
                        className="icon-button"
                        disabled={index === 0 || busyPhotoId !== null}
                        type="button"
                        onClick={() => movePhoto(index, -1)}
                      >
                        <ArrowLeft size={15} />
                      </button>
                      <button
                        aria-label={t("Move later")}
                        className="icon-button"
                        disabled={index === photos.length - 1 || busyPhotoId !== null}
                        type="button"
                        onClick={() => movePhoto(index, 1)}
                      >
                        <ArrowRight size={15} />
                      </button>
                      {photo.isCover ? null : (
                        <button
                          className="photo-cover-button"
                          disabled={busyPhotoId !== null}
                          type="button"
                          onClick={() =>
                            mutatePhoto(photo.id, () =>
                              updateCropLotPhoto(accessToken!, lot.id, photo.id, { isCover: true }),
                            )
                          }
                        >
                          {t("Set cover")}
                        </button>
                      )}
                      <button
                        aria-label={t("Delete photo")}
                        className="icon-button photo-delete"
                        disabled={busyPhotoId !== null}
                        type="button"
                        onClick={() => mutatePhoto(photo.id, () => removeCropLotPhoto(accessToken!, lot.id, photo.id))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="edit-listing-rail">
          <div className="edit-rail-card">
            <span className="edit-rail-eyebrow">{t("Price check")}</span>
            {rate ? (
              <>
                <strong className="mono-figure edit-rail-value">{v(taka(rate))}</strong>
                <span className="edit-rail-note">{t("Today's district rate per mon")}</span>
                {/* The pill carries the number; the line under it says what the number means. */}
                <span className={`edit-rail-delta ${verdict}`}>
                  {v(`${delta > 0 ? "+" : ""}${delta} %`)} {t("vs. today's")} {localCropName} {t("rate")}
                </span>
                <p>
                  {verdict === "fair"
                    ? t("Inside the fair range. Buyers see a green badge on this lot.")
                    : verdict === "above"
                      ? t("Above the fair range. Lots priced this high usually sit unsold for over a week.")
                      : t("Below the fair range. It will sell fast, but you are leaving money on the table.")}
                </p>
              </>
            ) : (
              <p>{t("No published district rate for this crop yet.")}</p>
            )}
          </div>

          <div className="edit-rail-card">
            <span className="edit-rail-eyebrow">{t("Lot value")}</span>
            <strong className="mono-figure edit-rail-value">{v(taka(lotValue))}</strong>
            <span className="edit-rail-note">
              {t("Before the")} {v(PLATFORM_FEE_LABEL)} {t("platform fee")}
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}
