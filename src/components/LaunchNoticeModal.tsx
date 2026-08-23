import { ArrowRight, Rocket, X } from "lucide-react";
import { useTranslate } from "../i18n";

export function LaunchNoticeModal({ onClose }: { onClose: () => void }) {
  const t = useTranslate();

  return (
    <div
      className="launch-notice-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="launch-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-notice-title"
      >
        <button
          aria-label={t("Close")}
          className="icon-button close-button launch-notice-close"
          onClick={onClose}
          title={t("Close")}
          type="button"
        >
          <X size={20} />
        </button>
        <div aria-hidden className="launch-notice-icon">
          <Rocket size={28} />
        </div>
        <span className="launch-notice-eyebrow">{t("Launching soon")}</span>
        <h2 id="launch-notice-title">{t("A fairer harvest journey is coming")}</h2>
        <p>
          {t(
            "AmarKrishok is preparing to connect farmers, buyers, and trusted delivery partners across Bangladesh.",
          )}
        </p>
        <button className="primary-button" onClick={onClose} type="button">
          <ArrowRight size={18} />
          {t("Explore the preview")}
        </button>
      </section>
    </div>
  );
}
