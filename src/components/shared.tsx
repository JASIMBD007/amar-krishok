import React from "react";
import { Box, Button, Card, TextField, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Banknote, CalendarClock, CalendarDays, MapPin, PackageCheck, PenLine } from "lucide-react";
import { environment } from "../config/environment";
import { useLanguage } from "../i18n";
import type { CropLot, Language } from "../types";

export type Translator = (text: string) => string;
export type ValueFormatter = (text: string | number) => string;

function formatPostedDate(value: string | undefined, language: Language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: environment.timeZone,
  }).format(date);
}

export function CropCard({
  lot,
  onOrder,
  onEdit,
  canEdit = false,
  t,
  v,
}: {
  lot: CropLot;
  onOrder: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  t: Translator;
  v: ValueFormatter;
}) {
  const language = useLanguage();
  const location = lot.upazilla ? `${t(lot.upazilla)}, ${t(lot.district)}` : t(lot.district);
  const postedDate = formatPostedDate(lot.postedAt, language);

  return (
    <Card component="article" className="crop-card">
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
        <div className="crop-card-actions">
          <Button className="order-button" variant="contained" type="button" onClick={onOrder}>{t("Order")}</Button>
          {canEdit && onEdit ? (
            <Button className="edit-lot-button" variant="outlined" type="button" onClick={onEdit}>
              <PenLine aria-hidden="true" size={16} />
              {t("Edit")}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function SectionTitle({ eyebrow, title, t }: { eyebrow: string; title: string; t: Translator }) {
  return (
    <Box className="section-title">
      <Typography component="span">{t(eyebrow)}</Typography>
      <Typography component="h1">{t(title)}</Typography>
    </Box>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return <Box className="form-grid">{children}</Box>;
}

export function Input({ label, placeholder, t }: { label: string; placeholder: string; t: Translator }) {
  return (
    <TextField className="input-field" label={t(label)} placeholder={t(placeholder)} fullWidth />
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
    <Card component="article" className="stat-card">
      <Icon size={21} />
      <Typography component="span">{t(label)}</Typography>
      <Typography component="strong">{v(value)}</Typography>
      <Typography component="p">{t(detail)}</Typography>
    </Card>
  );
}

export const defaultStatIcon = Banknote;
