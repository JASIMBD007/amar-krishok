import React from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Banknote, CalendarClock, CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { useLanguage } from "../i18n";
import type { CropLot } from "../types";

export type Translator = (text: string) => string;
export type ValueFormatter = (text: string | number) => string;

function formatPostedDate(value: string | undefined, language: "en" | "bn") {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function CropCard({
  lot,
  onOrder,
  t,
  v,
}: {
  lot: CropLot;
  onOrder: () => void;
  t: Translator;
  v: ValueFormatter;
}) {
  const language = useLanguage();
  const location = lot.upazilla ? `${t(lot.upazilla)}, ${t(lot.district)}` : t(lot.district);
  const postedDate = formatPostedDate(lot.postedAt, language);

  return (
    <article className="crop-card">
      <img src={lot.image} alt={`${t(lot.crop)} ${t("harvest")}`} />
      <div className="crop-card-body">
        <div className="crop-title-row">
          <div>
            <h2>{t(lot.crop)}</h2>
            <p>{t(lot.farmer)}</p>
          </div>
          <span>{v(lot.ask)}</span>
        </div>
        <div className="crop-meta">
          <span><MapPin size={15} /> {location}</span>
          <span><PackageCheck size={15} /> {t(lot.quantity)}</span>
          <span><BadgeCheck size={15} /> {t("Grade")} {t(lot.grade)}</span>
          <span><CalendarDays size={15} /> {t(lot.harvest)}</span>
        </div>
        {postedDate && (
          <div className="crop-card-footer">
            <span className="crop-post-date">
              <CalendarClock size={15} />
              {t("Posted")} {postedDate}
            </span>
          </div>
        )}
        <button className="order-button" type="button" onClick={onOrder}>{t("Order this lot")}</button>
      </div>
    </article>
  );
}

export function SectionTitle({ eyebrow, title, t }: { eyebrow: string; title: string; t: Translator }) {
  return (
    <div className="section-title">
      <span>{t(eyebrow)}</span>
      <h1>{t(title)}</h1>
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

export function Input({ label, placeholder, t }: { label: string; placeholder: string; t: Translator }) {
  return (
    <label className="input-field">
      <span>{t(label)}</span>
      <input placeholder={t(placeholder)} />
    </label>
  );
}

export function StatCard({
  detail,
  icon: Icon,
  label,
  t,
  v,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  t: Translator;
  v: ValueFormatter;
  value: string;
}) {
  return (
    <article className="stat-card">
      <Icon size={21} />
      <span>{t(label)}</span>
      <strong>{v(value)}</strong>
      <p>{t(detail)}</p>
    </article>
  );
}

export const defaultStatIcon = Banknote;
