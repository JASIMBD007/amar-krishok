import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { useTranslate } from "../../i18n";
import type { AuthUser, RegisteredAccount } from "../../types";

/**
 * The account's own profile, reached from the name in the header.
 *
 * Deliberately one page rather than the handoff's five tabs. Payouts, notification preferences
 * and signed-in devices each need backend fields that do not exist yet, and a tab that cannot
 * save is worse than no tab. This edits what the API already stores, through the same panel and
 * the same endpoint the buyer workspace has always used.
 */
export function ProfilePage({
  onProfileSaved,
  user,
}: {
  onProfileSaved: (account: RegisteredAccount) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
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
            {user?.name}
            {user?.district ? ` · ${t(user.district)}` : ""}
          </span>
        </div>
      </div>

      <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />
    </section>
  );
}
