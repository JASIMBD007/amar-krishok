import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { ApiRequestError } from "../../api/auth";
import { createReview, fetchReviewableFarmers, type ReviewableFarmer } from "../../api/reviews";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser } from "../../types";

const STARS = [1, 2, 3, 4, 5];

/** What each star means, so a rating is a judgement rather than a guess at the scale. */
const RATING_LABEL: Record<number, string> = {
  1: "Bad",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

/**
 * Asks the buyer to rate the farmers on a completed order.
 *
 * The server is the authority on who may review: this asks for the reviewable farmers and renders
 * nothing when the list is empty, which covers an order that is not complete, one belonging to
 * another buyer, and one already rated, without repeating any of those rules here.
 *
 * A rating is optional and never nagged. Once submitted the farmer drops off the list and the panel
 * disappears with the last of them.
 */
export function RateSellerPrompt({ orderId, user }: { orderId: string; user: AuthUser | null }) {
  const t = useTranslate();
  const v = useValueText();
  const [pending, setPending] = useState<ReviewableFarmer[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    if (!user?.accessToken) {
      setPending([]);
      return;
    }

    let active = true;
    fetchReviewableFarmers(user.accessToken, orderId)
      .then((result) => {
        if (active) {
          setPending(result.reviewable);
        }
      })
      .catch(() => {
        // A buyer who cannot review this order simply sees nothing, which is the same outcome as an
        // empty list, so a failure here needs no message of its own.
        if (active) {
          setPending([]);
        }
      });

    return () => {
      active = false;
    };
  }, [orderId, user?.accessToken]);

  const farmer = pending[0];

  // Reset the form whenever the panel moves on to the next farmer on the order.
  useEffect(() => {
    setRating(0);
    setComment("");
    setError("");
  }, [farmer?.farmerId]);

  if (!farmer) {
    return thanked ? (
      <div className="panel review-prompt">
        <strong>{t("Thanks for rating your seller")}</strong>
        <p>{t("Your rating is now part of this farmer's public score.")}</p>
      </div>
    ) : null;
  }

  const submit = () => {
    if (!user?.accessToken || rating === 0) {
      setError("Choose a star rating first.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    createReview(user.accessToken, orderId, { comment: comment.trim() || undefined, farmerId: farmer.farmerId, rating })
      .then(() => {
        setThanked(true);
        setPending((current) => current.filter((item) => item.farmerId !== farmer.farmerId));
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not save your rating.");
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="panel review-prompt">
      <span className="filter-eyebrow">{t("Rate your seller")}</span>
      <strong>
        {t("How did it go with")} {t(farmer.name)}?
      </strong>
      <p>{t("Buyers see this score on every lot the farmer lists, so only rate what you received.")}</p>

      <div className="review-star-row" role="radiogroup" aria-label={t("Rate your seller")}>
        {STARS.map((star) => (
          <button
            aria-checked={rating === star}
            aria-label={`${star} ${t(RATING_LABEL[star])}`}
            className={star <= rating ? "review-star on" : "review-star"}
            key={star}
            role="radio"
            type="button"
            onClick={() => setRating(star)}
          >
            <Star aria-hidden="true" size={22} />
          </button>
        ))}
        {rating > 0 ? <em>{t(RATING_LABEL[rating])}</em> : null}
      </div>

      <label className="review-comment">
        <span>{t("Anything to add? Optional.")}</span>
        <textarea
          maxLength={600}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("Weight, grade, packing, timing.")}
          rows={3}
          value={comment}
        />
      </label>

      {error ? <p className="soft-notice warn">{t(error)}</p> : null}

      <div className="review-prompt-actions">
        <button className="primary-button" disabled={isSubmitting || rating === 0} type="button" onClick={submit}>
          {t(isSubmitting ? "Saving" : "Submit rating")}
        </button>
        {pending.length > 1 ? (
          <span className="review-prompt-remaining">
            {v(pending.length - 1)} {t("more seller to rate on this order")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
