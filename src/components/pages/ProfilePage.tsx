import { useState } from "react";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";

/**
 * The account's own profile, in the handoff's shape: identity card on top, a rail of sections on
 * the left, one panel on the right.
 *
 * Only the sections that can actually save are listed. Payouts, notifications and devices need
 * backend fields that do not exist, and the handoff's PIN section does not apply because sign-in
 * is by password — a tab that silently drops what someone typed is worse than a tab that is absent.
 */
const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "documents", label: "Verification & documents" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function ProfilePage({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [section, setSection] = useState<SectionId>("profile");
  const isFarmer = user?.role === "farmer";

  return (
    <section className="page-wrap profile-page">
      <div className="profile-page-head">
        <span className="profile-page-avatar" aria-hidden="true">
          {(user?.name ?? "")
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("")}
        </span>
        <div>
          <h1>{t(isFarmer ? "Farmer profile" : "Buyer profile")}</h1>
          <span>
            {user?.name} · {t(isFarmer ? "Farmer" : "Buyer")}
            {user?.district ? ` · ${t(user.district)}` : ""}
          </span>
        </div>
      </div>

      <div className="profile-page-layout">
        <nav className="profile-page-rail" aria-label={t("Profile sections")}>
          {SECTIONS.map((item) => (
            <button
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "on" : ""}
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        {/* Both sections are served by the same panel: identity documents are edited there too,
            so splitting them into two forms would mean two saves for one record. */}
        <div className="profile-page-panel" data-section={section}>
          <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />
        </div>
      </div>
    </section>
  );
}
