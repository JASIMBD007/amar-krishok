import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Calendar,
  Check,
  Clock3,
  Eye,
  FileText,
  MessageSquare,
  Minus,
  Package,
  Phone,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  fetchAdminActivity,
  fetchMyCropLots,
  fetchMyOrders,
  isOwnUploadUrl,
  type BackendActivityEntry,
  type BackendCropLot,
  type BackendOrder,
} from "../../../api/auth";
import { decideOrderDispute, decideOrderEscrow, fetchDisputedOrders, fetchPublishedRates } from "../../../api/market";
import { useLanguage, useTranslate } from "../../../i18n";
import { ListLoading } from "../../EmptyState";
import type { AccountStatus, AuthUser, ChatThread, RegisteredAccount } from "../../../types";

export type AdminConsoleSection =
  | "overview"
  | "activity"
  | "traffic"
  | "orders"
  | "verification"
  | "listings"
  | "rates"
  | "users"
  | "disputes"
  | "inbox"
  | "roles";

export type AdminStaffRole = "super" | "support";

const PERMISSIONS = [
  { area: "Release / refund escrow", super: true, support: false },
  { area: "Open and close disputes", super: true, support: true },
  { area: "Verify farmers", super: true, support: true },
  { area: "Suspend listings", super: true, support: true },
  { area: "Publish district rates", super: true, support: false },
  { area: "Restrict or delete a user", super: true, support: false },
  { area: "Change staff roles", super: true, support: false },
];

const money = (value: number) => `৳ ${Math.round(value).toLocaleString("en-IN")}`;
const initials = (name: string) =>
  name
    .replace(/^(Md\.|Mst\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type ActivityTone = "amber" | "blue" | "green" | "red";

function activityColor(tone: ActivityTone) {
  if (tone === "green") return "#15803D";
  if (tone === "red") return "#CC0001";
  if (tone === "amber") return "#B45309";
  return "#1C69D4";
}

function orderValue(order: BackendOrder) {
  return Number(order.payments?.[0]?.amount ?? order.totalValue) || 0;
}

function isHeld(order: BackendOrder) {
  const payments = order.payments ?? [];
  return payments.length ? payments.some((payment) => payment.status === "HELD") : !["COMPLETED", "CANCELLED"].includes(order.status.toUpperCase());
}

function isRefunded(order: BackendOrder) {
  return order.payments?.some((payment) => payment.status === "REFUNDED") ?? false;
}

export function AdminDashboard({ registrations, user }: { registrations: RegisteredAccount[]; user: AuthUser | null }) {
  const t = useTranslate();
  const language = useLanguage();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [lots, setLots] = useState<BackendCropLot[]>([]);
  const [activity, setActivity] = useState<BackendActivityEntry[]>([]);
  const [activityError, setActivityError] = useState("");
  const [districtRates, setDistrictRates] = useState<Record<string, Record<string, number>>>({});
  const [rateFeeds, setRateFeeds] = useState<Array<{ district: string; error: string; publishedAt: string | null; rateCount: number }>>([]);
  const [districtRatesLoaded, setDistrictRatesLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.accessToken) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    Promise.all([fetchMyCropLots(user.accessToken), fetchMyOrders(user.accessToken)])
      .then(([nextLots, nextOrders]) => {
        setLots(nextLots);
        setOrders(nextOrders);
        setLoadError("");
        setLoaded(true);
      })
      .catch((error) => {
        setLoadError(error instanceof ApiRequestError ? error.message : "Could not load live dashboard data.");
        setLoaded(true);
      });

    fetchAdminActivity(user.accessToken, 6)
      .then((nextActivity) => {
        setActivity(nextActivity);
        setActivityError("");
      })
      .catch((error) => {
        setActivity([]);
        setActivityError(error instanceof ApiRequestError ? error.message : "Could not load recent staff activity.");
      });
  }, [user?.accessToken]);

  useEffect(() => {
    if (!loaded || loadError) return;
    const districts = Array.from(new Set(lots.filter((lot) => lot.status.toUpperCase() === "ACTIVE").map((lot) => lot.district.name)));
    if (!districts.length) {
      setDistrictRates({});
      setRateFeeds([]);
      setDistrictRatesLoaded(true);
      return;
    }

    let active = true;
    setDistrictRatesLoaded(false);
    Promise.all(districts.map(async (district) => {
      try {
        const published = await fetchPublishedRates(district);
        const today = new Date().toISOString().slice(0, 10);
        const currentRates = published.rates.filter((entry) => entry.publishedAt.slice(0, 10) === today);
        return {
          district,
          error: "",
          publishedAt: currentRates[0]?.publishedAt ?? null,
          rates: Object.fromEntries(currentRates.map((entry) => [entry.crop, entry.ratePerMon])),
        };
      } catch (error) {
        return {
          district,
          error: error instanceof ApiRequestError ? error.message : "Could not load this district's rates.",
          publishedAt: null,
          rates: {} as Record<string, number>,
        };
      }
    })).then((results) => {
      if (!active) return;
      setDistrictRates(Object.fromEntries(results.map((result) => [result.district, result.rates])));
      setRateFeeds(results.map((result) => ({
        district: result.district,
        error: result.error,
        publishedAt: result.publishedAt,
        rateCount: Object.keys(result.rates).length,
      })));
      setDistrictRatesLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [loadError, loaded, lots]);

  if (!loaded) {
    return <ListLoading label={t("Loading live dashboard data...")} />;
  }

  if (loadError) {
    return <p className="soft-notice warn">{t(loadError)}</p>;
  }

  const now = Date.now();
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today);
  const gmv = todaysOrders.filter((order) => !isRefunded(order)).reduce((sum, order) => sum + orderValue(order), 0);
  const heldOrders = orders.filter(isHeld);
  const escrow = heldOrders.reduce((sum, order) => sum + orderValue(order), 0);
  const liveLots = lots.filter((lot) => lot.status.toUpperCase() === "ACTIVE");
  const suspendedLots = lots.filter((lot) => lot.status.toUpperCase() === "CANCELLED");
  const pending = registrations.filter((account) => account.role === "farmer" && account.status === "pending").length;
  const disputes = orders.filter((order) => Boolean(order.disputeOpenedAt)).length;
  const signups = registrations.filter((account) => {
    const submitted = new Date(account.submittedAt).getTime();
    return Number.isFinite(submitted) && submitted >= now - 7 * 86_400_000;
  }).length;

  const kpis = [
    { detail: `${todaysOrders.length} ${t("orders today")}`, label: "GMV · today", value: money(gmv) },
    { detail: `${heldOrders.length} ${t("held orders")}`, label: "Held in escrow", value: money(escrow) },
    { detail: `${suspendedLots.length} ${t("cancelled listings")}`, label: "Live listings", value: String(liveLots.length) },
    { detail: `${pending} ${t("pending verifications")} · ${disputes} ${t("open disputes")}`, label: "Needs a decision", value: String(pending + disputes) },
    { detail: t("Created in the last 7 days"), label: "New signups", value: String(signups) },
  ];

  const liveGrowth = Array.from({ length: 7 }, (_, index) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (6 - index));
    const end = start.getTime() + 86_400_000;
    const value = orders.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= start.getTime() && created < end;
    }).length;
    return {
      label: start.toLocaleDateString(language, { weekday: "short" }),
      value,
      height: value,
    };
  });
  const growthPeak = Math.max(...liveGrowth.map((entry) => entry.height), 1);
  const chartGrowth = liveGrowth.map((entry) => ({ ...entry, height: entry.value ? Math.max(8, Math.round((entry.height / growthPeak) * 100)) : 0 }));

  const liveDistricts = orders.length
    ? Array.from(new Set([...lots.map((lot) => lot.district.name), ...orders.map((order) => order.district.name)]))
        .map((name) => ({
          name,
          gmv: orders.filter((order) => order.district.name === name && !isRefunded(order)).reduce((sum, order) => sum + orderValue(order), 0),
          lots: lots.filter((lot) => lot.district.name === name).length,
        }))
        .sort((first, second) => second.gmv - first.gmv)
        .slice(0, 5)
    : [];
  const districtPeak = Math.max(...liveDistricts.map((district) => district.gmv), 1);

  const comparedLots = liveLots.flatMap((lot) => {
    const districtRate = districtRates[lot.district.name]?.[lot.crop.name];
    if (!districtRate) return [];
    const delta = (Number(lot.pricePerKg) * 40) / districtRate - 1;
    return [{ delta, postedAt: new Date(lot.createdAt).getTime() }];
  });
  const fairLots = comparedLots.filter(({ delta }) => delta >= -0.08 && delta <= 0.03).length;
  const staleHighLots = comparedLots.filter(({ delta, postedAt }) => delta > 0.03 && postedAt < now - 7 * 86_400_000).length;
  const underpricedLots = comparedLots.filter(({ delta }) => delta < -0.08).length;
  const percentage = (count: number) => comparedLots.length ? Math.round((count / comparedLots.length) * 100) : 0;

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-kpis">
        {kpis.map(({ detail, label, value }) => (
          <article className={label === "Needs a decision" ? "needs-decision" : ""} key={label}>
            <span>{t(label)}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-panels">
        <article className="admin-dashboard-panel orders-chart">
          <header><strong>{t("Orders per day")}</strong><span>{t("Last 7 days")}</span></header>
          <div className="admin-growth-chart">
            {chartGrowth.map((day) => (
              <span className="admin-growth-column" key={day.label}>
                <small>{day.value}</small><i style={{ height: `${day.height}%` }} /><em>{day.label}</em>
              </span>
            ))}
          </div>
        </article>

        <article className="admin-dashboard-panel districts">
          <strong>{t("GMV by district")}</strong>
          {liveDistricts.length ? liveDistricts.map((district) => (
            <div className="admin-district-row" key={district.name}>
              <span><b>{t(district.name)}</b><small>{district.lots} {t("lots")}</small><em>{money(district.gmv)}</em></span>
              <i><b style={{ width: `${Math.round((district.gmv / districtPeak) * 100)}%` }} /></i>
            </div>
          )) : <p className="admin-dashboard-empty">{t("No district GMV has been recorded yet.")}</p>}
        </article>

        <article className="admin-dashboard-panel feed-health">
          <strong>{t("Rate feed health")}</strong>
          {!districtRatesLoaded ? <p className="admin-dashboard-empty">{t("Loading today's district rates...")}</p> : null}
          {districtRatesLoaded && rateFeeds.length === 0 ? <p className="admin-dashboard-empty">{t("No active listing districts to check.")}</p> : null}
          {districtRatesLoaded ? rateFeeds.map((feed) => {
            const publishedAt = feed.publishedAt ? new Date(feed.publishedAt) : null;
            const publishedDate = publishedAt && !Number.isNaN(publishedAt.getTime())
              ? publishedAt.toLocaleDateString(language, { day: "numeric", month: "short" })
              : "—";
            const ok = !feed.error && feed.rateCount > 0;
            return (
              <div key={feed.district}>
                <i className={ok ? "ok" : "bad"} />
                <span>{t(feed.district)}</span>
                <em>{feed.error ? t("Unavailable") : ok ? `${feed.rateCount} ${t("crops")}` : t("No feed today")}</em>
                <small>{publishedDate}</small>
              </div>
            );
          }) : null}
        </article>

        <article className="admin-dashboard-panel recent-activity">
          <strong>{t("Recent staff activity")}</strong>
          {activityError ? <p className="admin-dashboard-empty">{t(activityError)}</p> : null}
          {!activityError && activity.length ? activity.map((entry) => (
            <div key={entry.id}>
              <i style={{ background: activityColor(toneForAction(entry.action)) }} />
              <span><b>{entry.actorName}</b> {t(readableAction(entry.action))} <em className="admin-activity-target">{entry.target}</em></span>
              <small>{new Date(entry.createdAt).toLocaleString(language, { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" })}</small>
            </div>
          )) : null}
          {!activityError && activity.length === 0 ? <p className="admin-dashboard-empty">{t("No staff actions recorded yet.")}</p> : null}
        </article>

        <article className="admin-dashboard-panel integrity">
          <strong>{t("Rate integrity")}</strong>
          {!districtRatesLoaded ? <p className="admin-dashboard-empty">{t("Loading today's district rates...")}</p> : null}
          {districtRatesLoaded && comparedLots.length ? (
            <>
              <div><i className="good" /><span>{t("Listings within fair range")}</span><b>{percentage(fairLots)} %</b></div>
              <div><i className="warn" /><span>{t("Above range, unsold > 7 days")}</span><b>{percentage(staleHighLots)} %</b></div>
              <div><i className="danger" /><span>{t("Suspicious under-pricing")}</span><b>{percentage(underpricedLots)} %</b></div>
              <p>{comparedLots.length} {t("live listings compared with today's published rates.")}</p>
            </>
          ) : null}
          {districtRatesLoaded && comparedLots.length === 0 ? <p className="admin-dashboard-empty">{t("No live listings have today's district rate for comparison.")}</p> : null}
        </article>
      </div>
    </div>
  );
}

/** Colour by what the action did, not by which module wrote it. */
function toneForAction(action: string) {
  if (/reject|declin|withdraw|suspend|restrict|refund|dispute|delete/i.test(action)) return "red";
  if (/late|warn|pending|freeze/i.test(action)) return "amber";
  if (/publish|rate|feed|system/i.test(action)) return "blue";
  return "green";
}

/** "account.request.accepted" reads as "account request accepted". */
function readableAction(action: string) {
  return action.replace(/[._]/g, " ");
}

export function AdminActivity({ user }: { user: AuthUser | null }) {
  const t = useTranslate();
  const language = useLanguage();
  const [entries, setEntries] = useState<BackendActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const accessToken = user?.accessToken;

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;
    fetchAdminActivity(accessToken)
      .then((rows) => {
        if (active) {
          setEntries(rows);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load the activity log.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  if (isLoading) {
    return <ListLoading label={t("Loading the activity log...")} />;
  }

  if (error) {
    return <p className="soft-notice warn">{t(error)}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="admin-no-results">
        <span>{t("No staff actions recorded yet.")}</span>
      </div>
    );
  }

  return (
    <div className="admin-activity-list">
      {entries.map((entry) => {
        const when = new Date(entry.createdAt);
        const today = when.toDateString() === new Date().toDateString();
        return (
          <div key={entry.id}>
            <i style={{ background: activityColor(toneForAction(entry.action)) }} />
            <span>
              <strong>{entry.actorName}</strong> {t(readableAction(entry.action))}{" "}
              <em className="admin-activity-target">{entry.target}</em>
            </span>
            <time>
              {today
                ? when.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })
                : when.toLocaleDateString(language, { day: "numeric", month: "short" })}
            </time>
          </div>
        );
      })}
    </div>
  );
}

type ConsoleUser = {
  id: string;
  name: string;
  role: string;
  district: string;
  phone: string;
  status: string;
  vol: number;
  joined: string;
  /** Documents checked. An accepted-but-unverified account can sign in but cannot trade. */
  verified: boolean;
  account?: RegisteredAccount;
};

function toConsoleUsers(registrations: RegisteredAccount[]): ConsoleUser[] {
  return registrations.map((account) => ({
    id: account.id,
    name: account.name,
    role: account.role === "farmer" ? "Farmer" : "Buyer",
    district: account.district,
    phone: account.phone,
    status:
      account.status === "active"
        ? account.verifiedAt
          ? "Verified"
          : "Unverified"
        : account.status === "pending"
          ? "Pending"
          : "Restricted",
    verified: Boolean(account.verifiedAt),
    vol: account.orderCount ?? account.cropLotCount ?? 0,
    joined: Number.isNaN(new Date(account.submittedAt).getTime()) ? "—" : String(new Date(account.submittedAt).getFullYear()),
    account,
  }));
}

export function AdminUsers({
  onMessageUser,
  onNotice,
  onOpenDocument,
  onSetVerified,
  onUpdateRegistration,
  registrations,
  staffRole,
}: {
  onMessageUser: (target: { id?: string; name: string; phone: string; role: "buyer" | "farmer" }) => void;
  onNotice: (message: string) => void;
  onOpenDocument: (value: string) => void;
  onSetVerified: (id: string, verified: boolean) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  staffRole: AdminStaffRole;
}) {
  const t = useTranslate();
  const users = useMemo(() => toConsoleUsers(registrations), [registrations]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users.find((user) => user.id === selectedId);
  const filtered = users.filter((user) => {
    const filterMatch = filter === "All" || user.role === filter || user.status === filter;
    const needle = query.trim().toLowerCase();
    return filterMatch && (!needle || `${user.name} ${user.district} ${user.phone}`.toLowerCase().includes(needle));
  });

  const update = (status: AccountStatus, message: string) => {
    if (!selected) return;
    if (selected.account) onUpdateRegistration(selected.id, status);
    onNotice(message);
    setSelectedId(null);
  };

  return (
    <>
      <div className="admin-user-tools">
        <label><Search aria-hidden="true" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Name, district or phone")} /></label>
        <div>{["All", "Farmer", "Buyer", "Pending", "Unverified", "Restricted"].map((item) => <button className={filter === item ? "on" : ""} key={item} onClick={() => setFilter(item)} type="button">{t(item)}</button>)}</div>
      </div>

      {filtered.length ? (
        <div className="admin-users-table-wrap">
          <div className="admin-users-table">
            <div className="admin-users-head"><span>{t("User")}</span><span>{t("Role")}</span><span>{t("District")}</span><span>{t("Phone")}</span><span>{t("Orders")}</span><span>{t("Status")}</span></div>
            {filtered.map((entry) => (
              <button className="admin-user-row" key={entry.id} onClick={() => setSelectedId(entry.id)} type="button">
                <span><i>{initials(entry.name)}</i><strong>{t(entry.name)}</strong></span><span>{t(entry.role)}</span><span>{t(entry.district)}</span><span>{entry.phone}</span><span>{entry.vol}</span><span><em className={entry.status.toLowerCase()}>{t(entry.status)}</em></span>
              </button>
            ))}
          </div>
        </div>
      ) : <div className="admin-no-results"><span>{t("No user matches that filter")}</span></div>}

      {selected ? (
        <div className="admin-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <aside className="admin-user-drawer" aria-label={t("User details")}>
            <header><i>{initials(selected.name)}</i><span><strong>{t(selected.name)}</strong><small>{t(selected.role)} · {t(selected.district)}</small></span><button aria-label={t("Close")} onClick={() => setSelectedId(null)} type="button"><X size={20} /></button></header>
            <div className="admin-user-drawer-body">
              <div className="admin-user-meta"><span><Phone size={15} />{selected.phone}</span><span><Calendar size={15} />{t("On the platform since")} {selected.joined}</span><span><Package size={15} />{selected.vol} {t("completed orders")}</span><span><BadgeCheck size={15} />{t("Status")} · {t(selected.status)}</span></div>
              {/* The documents are the whole point of the review, so they sit above the buttons. */}
              {selected.account ? (
                <div className="admin-user-documents">
                  <span className="filter-eyebrow">{t("Documents")}</span>
                  {selected.account.identity ? (
                    isOwnUploadUrl(selected.account.identity) ? (
                      <button className="admin-user-document" type="button" onClick={() => onOpenDocument(selected.account!.identity)}>
                        <FileText aria-hidden="true" size={15} />
                        {t("Open identity document")}
                      </button>
                    ) : (
                      <span className="admin-user-document plain">
                        <FileText aria-hidden="true" size={15} />
                        {selected.account.identity}
                      </span>
                    )
                  ) : (
                    <span className="admin-user-document empty">{t("No document uploaded. Check the phone number instead.")}</span>
                  )}
                </div>
              ) : null}
              <p>{t("Editing a user record is logged against your staff account and the user is notified by SMS.")}</p>
              {/* Review is two acts. A pending request is accepted or turned down; only once the
                  documents have been seen does the account become able to post or order. */}
              <div className="admin-user-actions">
                {selected.status === "Pending" ? (
                  <>
                    <button className="primary" onClick={() => update("active", `${selected.name} accepted. They can sign in, but cannot trade until verified.`)} type="button">{t("Accept request")}</button>
                    <button className="danger" onClick={() => update("rejected", `${selected.name}'s request was declined.`)} type="button">{t("Decline request")}</button>
                  </>
                ) : null}
                {selected.status === "Unverified" ? (
                  <button className="primary" onClick={() => { onSetVerified(selected.id, true); onNotice(`${selected.name} verified. They can now post and order.`); setSelectedId(null); }} type="button">{t("Mark verified")}</button>
                ) : null}
                {selected.status === "Verified" && staffRole === "super" ? (
                  <button onClick={() => { onSetVerified(selected.id, false); onNotice(`${selected.name}'s verification was withdrawn.`); setSelectedId(null); }} type="button">{t("Withdraw verification")}</button>
                ) : null}
                {selected.status === "Restricted" ? (
                  <button className="primary" onClick={() => update("active", `${selected.name} restored. Verify their documents to let them trade.`)} type="button">{t("Restore account")}</button>
                ) : null}
                <button onClick={() => { setSelectedId(null); onMessageUser({ id: selected.account?.id, name: selected.name, phone: selected.phone, role: selected.role === "Farmer" ? "farmer" : "buyer" }); }} type="button">{t("Message this user")}</button>
                <button onClick={() => { onNotice(`A new 4-digit PIN was sent to ${selected.phone}.`); setSelectedId(null); }} type="button">{t("Send new login PIN")}</button>
                {staffRole === "super" && selected.status !== "Restricted" ? <button className="danger" onClick={() => update("rejected", `${selected.name} restricted — listings hidden, payouts paused.`)} type="button">{t("Restrict account")}</button> : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function AdminDisputes({
  onMessageUser,
  onNotice,
  user,
}: {
  onMessageUser: (target: { id?: string; name: string; phone: string; role: "buyer" | "farmer" }) => void;
  onNotice: (message: string) => void;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const accessToken = user?.accessToken;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetchDisputedOrders(accessToken)
      .then((rows) => {
        setOrders(rows);
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load disputes.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => load(), [load]);

  /**
   * Release and refund settle the escrow and close the dispute; a partial refund is not a decision
   * this endpoint can express, so it is not offered as though it were.
   */
  const settle = (order: BackendOrder, action: "release" | "refund") => {
    if (!accessToken) return;
    setBusyId(order.id);
    decideOrderEscrow(accessToken, order.id, action)
      .then(() => decideOrderDispute(accessToken, order.id, "close"))
      .then(() => {
        setOrders((current) => current.filter((row) => row.id !== order.id));
        onNotice(
          action === "release"
            ? `${order.id} closed — escrow released to the farmer.`
            : `${order.id} closed — escrow refunded to ${order.buyer?.name ?? "the buyer"}.`,
        );
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not settle that dispute.");
      })
      .finally(() => setBusyId(null));
  };

  if (isLoading) {
    return <ListLoading label={t("Loading disputes...")} />;
  }

  if (error) {
    return <p className="soft-notice warn">{t(error)}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="admin-no-results">
        <span>{t("No open disputes. Escrow is moving normally.")}</span>
      </div>
    );
  }

  return (
    <div className="admin-dispute-list">
      {orders.map((order) => {
        const opened = order.disputeOpenedAt ? new Date(order.disputeOpenedAt) : null;
        const hoursOpen = opened ? Math.floor((Date.now() - opened.getTime()) / 3_600_000) : 0;
        // 24 h SLA, as the page heading promises.
        const overdue = hoursOpen >= 24;
        const held = order.payments?.find((payment) => payment.status === "HELD");
        const farmerName = order.items?.[0]?.cropLot?.farmer?.name ?? t("the farmer");
        return (
          <article key={order.id}>
            <header>
              <span>
                <span>
                  <b>{order.id.slice(-6).toUpperCase()}</b>
                  <strong>{t(order.items?.[0]?.crop?.name ?? "Order dispute")}</strong>
                  <em className={overdue ? "urgent" : "calm"}>
                    SLA {overdue ? `${t("overdue")} ${hoursOpen - 24} h` : `${t("due in")} ${24 - hoursOpen} h`}
                  </em>
                </span>
                <small>
                  {t("Order")} {order.id.slice(-6).toUpperCase()} · {order.buyer?.name ?? t("Buyer")} vs. {farmerName} ·{" "}
                  {t("opened")} {hoursOpen} h {t("ago")}
                </small>
              </span>
              <span>
                <strong>{money(Number(held?.amount ?? order.totalValue) || 0)}</strong>
                <small>{t("frozen in escrow")}</small>
              </span>
            </header>
            <footer>
              <button className="release" disabled={busyId === order.id} onClick={() => settle(order, "release")} type="button">
                {t("Release to farmer")}
              </button>
              <button className="refund" disabled={busyId === order.id} onClick={() => settle(order, "refund")} type="button">
                {t("Refund buyer")}
              </button>
              <button
                className="conversation"
                type="button"
                onClick={() =>
                  onMessageUser({
                    id: order.buyer?.id,
                    name: order.buyer?.name ?? "",
                    phone: order.buyer?.phone ?? "",
                    role: "buyer",
                  })
                }
              >
                <MessageSquare size={15} />
                {t("Open conversation")}
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}


function readableTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

export function AdminInbox({ chatThreads, onAdminReply, onThreadOpen }: { chatThreads: ChatThread[]; onAdminReply: (threadId: string, text: string) => void; onThreadOpen: (threadId: string) => void }) {
  const t = useTranslate();
  const [activeId, setActiveId] = useState(chatThreads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const active = chatThreads.find((thread) => thread.id === activeId) ?? chatThreads[0];

  useEffect(() => {
    if (active?.status === "waiting") onThreadOpen(active.id);
  }, [active?.id, active?.status, onThreadOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!active || !text) return;
    onAdminReply(active.id, text);
    setDraft("");
  };

  if (!active) return <div className="admin-no-results"><span>{t("No conversations yet")}</span></div>;
  return (
    <div className="admin-inbox">
      <div className="admin-thread-list">
        {chatThreads.map((thread) => (
          <button className={thread.id === active.id ? "on" : ""} key={thread.id} onClick={() => setActiveId(thread.id)} type="button">
            <i>{initials(thread.participantName)}</i><span><strong>{t(thread.participantName)}</strong><small>{t(thread.subject)}</small></span><time>{readableTime(thread.updatedAt)}</time>
          </button>
        ))}
      </div>
      <section className="admin-conversation">
        <header><span><strong>{t(active.participantName)}</strong><small>{t(active.participantRole === "farmer" ? "Farmer" : active.participantRole === "buyer" ? "Buyer" : "Guest")} · {t(active.subject)}</small></span><em><Clock3 size={13} />{t("Reply due in 5 h")}</em></header>
        <div className="admin-message-list">
          {active.messages.map((message) => <div className={message.senderRole === "admin" ? "staff" : "participant"} key={message.id}><span>{message.text}</span><time>{readableTime(message.createdAt)}</time></div>)}
        </div>
        <form onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("Reply as AmarKrishok support")} /><button type="submit"><Send size={16} />{t("Reply")}</button></form>
      </section>
    </div>
  );
}

export function AdminRoles({ user }: { user: AuthUser | null }) {
  const t = useTranslate();
  return (
    <div className="admin-roles">
      <div className="admin-role-matrix">
        <div className="admin-role-head"><span>{t("Permission")}</span><span>{t("Super admin")}</span><span>{t("Support agent")}</span></div>
        {PERMISSIONS.map((permission) => <div className="admin-role-row" key={permission.area}><span>{t(permission.area)}</span><span>{permission.super ? <Check size={17} /> : <Minus size={17} />}</span><span>{permission.support ? <Check size={17} /> : <Minus size={17} />}</span></div>)}
      </div>
      <div className="admin-staff-accounts">
        <header><strong>{t("Staff accounts")}</strong></header>
        {user ? (
          <div><i>{initials(user.name)}</i><span><strong>{user.name}</strong><small>{user.username}</small></span><em>{t("Super admin")}</em><time>{t("Current session")}</time></div>
        ) : <div className="admin-no-results"><span>{t("No staff account is available from the current session.")}</span></div>}
      </div>
    </div>
  );
}

export function SupportScopePill() {
  const t = useTranslate();
  return <span className="admin-support-scope"><Eye size={13} />{t("Support scope · escrow actions hidden")}</span>;
}
