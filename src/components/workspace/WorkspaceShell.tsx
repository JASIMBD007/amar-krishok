import type { ReactNode } from "react";
import { BadgeCheck, Clock3, type LucideIcon, MessageSquare, User } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";

/**
 * The workspace shell both role dashboards sit in: the light-surface sibling of the admin console.
 * Identity block, one primary action, grouped nav with live counts, and Messages + Profile pinned to
 * the bottom. Counts live next to the section they open, never in the global nav.
 */

export type WorkspaceNavItem<Tab extends string> = {
  count?: number;
  icon: LucideIcon;
  label: string;
  tab: Tab;
};

export type WorkspaceNavGroup<Tab extends string> = {
  items: Array<WorkspaceNavItem<Tab>>;
  title: string;
};

function initialsOf(name: string) {
  return name
    .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * "Rates updated today 08:00" only when the publication really was today. The label and the value
 * are kept apart so the sentence can be translated without the timestamp being baked into the key.
 */
function ratesLine(publishedAt: string | null) {
  if (!publishedAt) {
    return null;
  }

  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    return null;
  }

  const inDhaka = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Asia/Dhaka" }).format(published);
  const day = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(value);

  return day(published) === day(new Date())
    ? { label: "Rates updated today", value: inDhaka({ hour: "2-digit", minute: "2-digit" }) }
    : { label: "Rates last updated", value: inDhaka({ day: "2-digit", month: "short" }) };
}

export function WorkspaceShell<Tab extends string>({
  children,
  groups,
  identity,
  onMessages,
  onProfile,
  onSelectTab,
  primaryAction,
  ratesPublishedAt,
  subtitle,
  tab,
  title,
}: {
  children: ReactNode;
  groups: Array<WorkspaceNavGroup<Tab>>;
  identity: { district: string; name: string; verificationPending: boolean; verified: boolean };
  onMessages: () => void;
  onProfile: () => void;
  onSelectTab: (tab: Tab) => void;
  /** Farmer: Post a crop, in red. Buyer: Browse the market, in green. One per workspace. */
  primaryAction: { icon: LucideIcon; label: string; onClick: () => void; tone: "green" | "red" };
  ratesPublishedAt: string | null;
  subtitle: string;
  tab: Tab;
  title: string;
}) {
  const t = useTranslate();
  const v = useValueText();
  const PrimaryIcon = primaryAction.icon;
  const rates = ratesLine(ratesPublishedAt);

  return (
    <section className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-identity">
          <span className="workspace-avatar" aria-hidden="true">
            {initialsOf(identity.name)}
          </span>
          <span className="workspace-identity-copy">
            <strong>{identity.name}</strong>
            <small>{identity.district ? t(identity.district) : ""}</small>
          </span>
        </div>

        <button
          className={primaryAction.tone === "red" ? "workspace-primary danger" : "workspace-primary"}
          type="button"
          onClick={primaryAction.onClick}
        >
          <PrimaryIcon aria-hidden="true" size={17} />
          {/* The label is its own element so the icon rail can hide it and keep the icon. */}
          <span>{t(primaryAction.label)}</span>
        </button>

        <nav className="workspace-nav" aria-label={t(title)}>
          {groups.map((group) => (
            <div key={group.title}>
              <span>{t(group.title)}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    aria-current={tab === item.tab ? "page" : undefined}
                    className={tab === item.tab ? "on" : ""}
                    key={item.tab}
                    type="button"
                    onClick={() => onSelectTab(item.tab)}
                  >
                    <Icon aria-hidden="true" size={16} />
                    <span>{t(item.label)}</span>
                    {item.count ? <em className="mono-figure">{v(item.count)}</em> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="workspace-nav-footer">
          <button type="button" onClick={onMessages}>
            <MessageSquare aria-hidden="true" size={16} />
            <span>{t("Messages")}</span>
          </button>
          <button type="button" onClick={onProfile}>
            <User aria-hidden="true" size={16} />
            <span>{t("Profile & settings")}</span>
          </button>
        </div>
      </aside>

      <div className="workspace-content">
        <header className="workspace-heading">
          <div>
            <h1>{t(title)}</h1>
            <span>{t(subtitle)}</span>
          </div>
          <aside>
            {identity.verified ? (
              <span className="workspace-verify verified">
                <BadgeCheck aria-hidden="true" size={13} />
                {t("Verified")}
              </span>
            ) : null}
            {identity.verificationPending ? (
              <span className="workspace-verify pending">
                <Clock3 aria-hidden="true" size={13} />
                {t("Verification in progress")}
              </span>
            ) : null}
            {rates ? (
              <span className="workspace-rates-line">
                {t(rates.label)} {v(rates.value)}
              </span>
            ) : null}
          </aside>
        </header>

        {children}
      </div>
    </section>
  );
}
