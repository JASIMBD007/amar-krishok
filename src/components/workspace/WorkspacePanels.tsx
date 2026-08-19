import type { ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  FileText,
  PackageCheck,
  Search,
  ShieldCheck,
  Sprout,
  Tag,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  DashboardCropSlice,
  DashboardDayPoint,
  DashboardLedgerRow,
  DashboardNextMovement,
  DashboardStageCount,
  DashboardTask,
} from "../../api/dashboard";
import { useTranslate, useValueText } from "../../i18n";
import { taka } from "../../market/marketData";

/**
 * The panels both dashboards share. Every one carries its own empty state: a dashboard with no
 * orders shows zeros beside empty panels, never a zero KPI above a panel that asserts a full book.
 */

/** Lucide names the server sends for generated tasks, resolved here so the API stays data-only. */
const TASK_ICONS: Record<string, LucideIcon> = {
  "file-text": FileText,
  "package-check": PackageCheck,
  search: Search,
  sprout: Sprout,
  tag: Tag,
  "trending-down": TrendingDown,
};

const STAGE_COLOURS: Record<DashboardStageCount["key"], string> = {
  "awaiting-pickup": "amber",
  "in-transit": "blue",
  delivered: "green",
  "paid-out": "grey",
};

export function KpiTile({
  children,
  eyebrow,
  footnote,
  qualifier,
  tone,
  value,
}: {
  children?: ReactNode;
  eyebrow: string;
  footnote?: ReactNode;
  /** Sits under the eyebrow when the figure needs a scope stated before it is read. */
  qualifier?: string;
  tone?: "danger";
  value: string;
}) {
  const t = useTranslate();
  const v = useValueText();

  return (
    <article className="workspace-kpi">
      <span className="workspace-kpi-eyebrow">{t(eyebrow)}</span>
      {qualifier ? <span className="workspace-kpi-qualifier">{t(qualifier)}</span> : null}
      <strong className={tone === "danger" ? "workspace-kpi-value mono-figure danger" : "workspace-kpi-value mono-figure"}>
        {v(value)}
      </strong>
      {footnote ? <span className="workspace-kpi-footnote">{footnote}</span> : null}
      {children}
    </article>
  );
}

/**
 * The spine of the page: what costs money if it is left alone, ranked. Rows come from the server's
 * generated conditions, so an empty list genuinely means nothing is waiting.
 */
export function NeedsYouFirst({ onAct, tasks }: { onAct: (task: DashboardTask) => void; tasks: DashboardTask[] }) {
  const t = useTranslate();

  return (
    <section className="workspace-panel needs-you-first">
      <div className="workspace-panel-head">
        <h2>{t("Needs you first")}</h2>
        <span>{t("Ranked by what costs you money")}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="workspace-task-clear">
          <CheckCircle2 aria-hidden="true" size={18} />
          <span>{t("Nothing is waiting on you right now.")}</span>
        </div>
      ) : null}

      {tasks.map((task) => {
        const Icon = TASK_ICONS[task.icon] ?? CheckCircle2;
        return (
          <div className="workspace-task" key={task.key}>
            <span className={`workspace-task-icon ${task.tone}`} aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="workspace-task-copy">
              <strong>{t(task.title)}</strong>
              <span>{t(task.body)}</span>
            </span>
            <button className="secondary-button" type="button" onClick={() => onAct(task)}>
              {t(task.cta)}
            </button>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Value moved per day, one bar per day an order was actually placed. The header states the real span
 * rather than claiming a fixed "last 7 days" the data may not cover.
 */
export function ValueMovedPerDay({
  emptyHint,
  series,
  tone = "green",
  tradingDays,
}: {
  emptyHint: string;
  series: DashboardDayPoint[];
  tone?: "blue" | "green";
  tradingDays: number;
}) {
  const t = useTranslate();
  const v = useValueText();
  const peak = Math.max(...series.map((point) => point.value), 1);

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <h2>{t("Value moved per day")}</h2>
        <span>
          {tradingDays === 1 ? t("One trading day so far") : `${v(tradingDays)} ${t("trading days")}`}
        </span>
      </div>

      {series.length === 0 ? (
        <div className="workspace-panel-empty">
          <BarChart3 aria-hidden="true" size={26} />
          <span>{t(emptyHint)}</span>
        </div>
      ) : (
        <div className={`workspace-day-chart ${tone}`}>
          {series.map((point) => (
            <span className="workspace-day-column" key={point.date}>
              <small className="mono-figure">{v(taka(point.value))}</small>
              <i style={{ height: `${Math.max(4, Math.round((point.value / peak) * 100))}%` }} />
              <em>{v(point.label)}</em>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Stage counts derived from the order list, so the panel cannot disagree with the order table. */
export function WhereOrdersSit({ hasOrders, stages }: { hasOrders: boolean; stages: DashboardStageCount[] }) {
  const t = useTranslate();
  const v = useValueText();

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <h2>{t("Where your orders sit")}</h2>
      </div>

      {hasOrders ? (
        <div className="workspace-stage-list">
          {stages.map((stage) => (
            <div className="workspace-stage-row" key={stage.key}>
              <i className={STAGE_COLOURS[stage.key]} aria-hidden="true" />
              <span>{t(stage.label)}</span>
              <em className={`mono-figure ${STAGE_COLOURS[stage.key]}`}>{v(stage.count)}</em>
            </div>
          ))}
        </div>
      ) : (
        <p className="panel-note">{t("No orders on the books yet.")}</p>
      )}
    </section>
  );
}

export function ByCrop({ note, slices }: { note: string; slices: DashboardCropSlice[] }) {
  const t = useTranslate();
  const v = useValueText();
  const peak = Math.max(...slices.map((slice) => slice.value), 1);

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <h2>{t("By crop")}</h2>
        {slices.length > 0 ? <span>{t(note)}</span> : null}
      </div>

      {slices.length === 0 ? (
        <p className="panel-note">{t("Nothing to break down yet.")}</p>
      ) : (
        <div className="workspace-crop-list">
          {slices.map((slice) => (
            <div className="workspace-crop-row" key={slice.crop}>
              <div>
                <strong>{t(slice.crop)}</strong>
                <span className="mono-figure">{v(taka(slice.value))}</span>
              </div>
              <i>
                <b style={{ width: `${Math.max(4, Math.round((slice.value / peak) * 100))}%` }} />
              </i>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Whose money moves next, and whose share it is. The farmer's card and the buyer's card show the
 * same figure, and each says explicitly whether it is being paid to the caller or to the farmer —
 * the same number must never read as "released to you" on both screens.
 */
export function NextMoneyMovement({
  emptyHint,
  movement,
  whose,
}: {
  emptyHint: string;
  movement: DashboardNextMovement;
  whose: string;
}) {
  const t = useTranslate();
  const v = useValueText();

  return (
    <section className="workspace-panel next-movement">
      <header>
        <ShieldCheck aria-hidden="true" size={16} />
        <strong>{t("Next money movement")}</strong>
      </header>
      <div>
        {movement ? (
          <>
            <strong className="mono-figure">{v(taka(movement.amount))}</strong>
            <span>
              {t(whose)} <span className="mono-figure">{v(movement.reference)}</span>
            </span>
          </>
        ) : (
          <span>{t(emptyHint)}</span>
        )}
      </div>
    </section>
  );
}

/**
 * The money ledger. On the farmer's side transport and the platform fee are itemised as their own
 * outgoing rows, so the three-way split is visible rather than quietly netted off.
 */
export function LedgerPanel({
  emptyHint,
  rows,
  title,
}: {
  emptyHint: string;
  rows: DashboardLedgerRow[];
  title: string;
}) {
  const t = useTranslate();
  const v = useValueText();
  const when = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dhaka" });

  return (
    <section className="workspace-panel workspace-ledger">
      <div className="workspace-panel-head">
        <h2>{t(title)}</h2>
      </div>

      {rows.length === 0 ? (
        <div className="workspace-panel-empty">
          <Wallet aria-hidden="true" size={26} />
          <span>{t(emptyHint)}</span>
        </div>
      ) : (
        <div className="workspace-ledger-list">
          {rows.map((row) => (
            <div className="workspace-ledger-row" key={row.key}>
              <span>
                <strong>
                  <span className="mono-figure">{v(row.reference)}</span> · {t(row.title)}
                </strong>
                <small>{v(when.format(new Date(row.when)))}</small>
              </span>
              <em className={row.incoming ? "mono-figure incoming" : "mono-figure outgoing"}>{v(taka(row.amount))}</em>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
