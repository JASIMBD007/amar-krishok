import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ImageIcon, Trash2, Upload } from "lucide-react";
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
  PLATFORM_FEE_RATE,
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
import { VerdictPill } from "../market/MarketBits";

const MAX_PHOTOS = 6;

function numericValue(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Edit a live listing. Changes reach buyers immediately, so the price check sits beside the form
 * rather than behind a save: the farmer sees where their ask lands before committing to it.
 */
export function EditListingPage({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate();
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

  const [grade, setGrade] = useState("A");
  const [quantityMon, setQuantityMon] = useState(0);
  const [pricePerMon, setPricePerMon] = useState(0);
  const [pickup, setPickup] = useState<string>(pickupOptions[0]);
  const [notes, setNotes] = useState("");

  const accessToken = user?.accessToken;

  const applyLot = useCallback((next: BackendCropLot) => {
    setLot(next);
    setGrade(next.grade.replace(/^Grade\s+/i, "") || "A");
    setQuantityMon(Math.round(kgToMon(numericValue(next.quantityKg))));
    setPricePerMon(perKgToPerMon(numericValue(next.pricePerKg)));
    setNotes(next.notes ?? "");
  }, []);

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
      <section className="page-wrap edit-listing-page">
        <ListLoading label={t("Loading this listing...")} />
      </section>
    );
  }

  if (!lot) {
    return (
      <section className="page-wrap edit-listing-page">
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

  const cropName = lot.crop.name;
  const rate = rates[cropName];
  const delta = rate ? deltaVsRate(pricePerMon, rate) : 0;
  const lotValue = pricePerMon * quantityMon;
  const photos = [...(lot.photos ?? [])].sort((first, second) => first.sortOrder - second.sortOrder);
  const isPaused = lot.status.toUpperCase() !== "ACTIVE";

  const save = () => {
    if (!accessToken) return;
    setIsSaving(true);
    setError("");
    updateCropLot(accessToken, lot.id, {
      grade,
      notes: notes.trim() || undefined,
      pricePerKg: perMonToPerKg(pricePerMon),
      quantityKg: monToKg(quantityMon),
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
    <section className="page-wrap edit-listing-page">
      <Link className="back-link" to="/farmer">
        <ArrowLeft aria-hidden="true" size={16} />
        {t("Farmer desk")}
      </Link>

      <div className="edit-listing-head">
        <div>
          <h1>{t("Edit listing")}</h1>
          <span>{t("Changes go live at once. Buyers watching this crop get an SMS if the price drops.")}</span>
        </div>
        <div className="edit-listing-actions">
          <button className="secondary-button" disabled={isSaving} type="button" onClick={togglePaused}>
            {t(isPaused ? "Resume listing" : "Pause listing")}
          </button>
          <button className="primary-button" disabled={isSaving} type="button" onClick={save}>
            {t(isSaving ? "Saving" : "Save & publish")}
          </button>
        </div>
      </div>

      {error ? <p className="soft-notice warn">{t(error)}</p> : null}
      {notice ? <p className="soft-notice">{t(notice)}</p> : null}

      <div className="edit-listing-layout">
        <div className="edit-listing-main">
          <div className="panel edit-listing-card">
            <h2>{t("Crop & price")}</h2>
            <div className="edit-listing-grid">
              <label className="input-field">
                <span>{t("Crop")}</span>
                <input disabled value={cropName} />
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

          <div className="panel edit-listing-card">
            <div className="edit-photos-head">
              <h2>{t("Photos")}</h2>
              <span className="mono-figure">
                {v(photos.length)} {t("of")} {v(MAX_PHOTOS)} {t("photos")}
              </span>
              <label className="secondary-button photo-add-button">
                <input
                  accept="image/*"
                  className="hidden-file-input"
                  disabled={photos.length >= MAX_PHOTOS || busyPhotoId !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) addPhoto(file);
                  }}
                  type="file"
                />
                <Upload aria-hidden="true" size={16} />
                {t("Add photo")}
              </label>
            </div>

            {photos.length === 0 ? (
              <p className="panel-note">{t("No photos yet. Buyers trust a listing with real farm photos.")}</p>
            ) : (
              <div className="photo-grid">
                {photos.map((photo, index) => (
                  <figure className="photo-tile" key={photo.id}>
                    <span className="photo-index mono-figure">{v(index + 1)}</span>
                    {photo.isCover ? <span className="photo-cover-badge">{t("COVER")}</span> : null}
                    <span className="photo-thumb">
                      {photo.url ? <img alt={photo.caption ?? cropName} src={photo.url} /> : <ImageIcon size={22} />}
                    </span>
                    <figcaption>{photo.caption ?? `${t(cropName)} ${v(index + 1)}`}</figcaption>
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
                          className="secondary-button photo-cover-button"
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
          <div className="panel edit-rail-card">
            <span className="filter-eyebrow">{t("Price check")}</span>
            {rate ? (
              <>
                <strong className="mono-figure edit-rail-value">{v(taka(rate))}</strong>
                <span className="edit-rail-note">{t("Today's district rate per mon")}</span>
                <VerdictPill verdict={fairVerdict(delta)} />
                <p>
                  {delta === 0
                    ? t("Inside the fair range. Buyers see a green badge on this lot.")
                    : `${v(`${delta > 0 ? "+" : ""}${delta} %`)} ${t("vs. today's rate for")} ${
                        cropNamesBn[cropName] ? t(cropName) : cropName
                      }.`}
                </p>
              </>
            ) : (
              <p>{t("No published district rate for this crop yet.")}</p>
            )}
          </div>

          <div className="panel edit-rail-card">
            <span className="filter-eyebrow">{t("Lot value")}</span>
            <strong className="mono-figure edit-rail-value">{v(taka(lotValue))}</strong>
            <span className="edit-rail-note">
              {t("Before the")} {v(`${PLATFORM_FEE_RATE * 100} %`)} {t("platform fee")}
            </span>
          </div>

          <button className="secondary-button full" type="button" onClick={() => navigate("/farmer")}>
            {t("Back to desk")}
          </button>
        </aside>
      </div>
    </section>
  );
}
