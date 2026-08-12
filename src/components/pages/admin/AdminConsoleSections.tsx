import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Plus,
  Search,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  fetchMyCropLots,
  fetchMyOrders,
  isOwnUploadUrl,
  type BackendCropLot,
  type BackendOrder,
} from "../../../api/auth";
import { useTranslate } from "../../../i18n";
import type { AccountStatus, AuthUser, ChatMessage, ChatThread, RegisteredAccount } from "../../../types";

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

const GROWTH = [
  { label: "Mon", value: 46 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 72 },
  { label: "Fri", value: 88 },
  { label: "Sat", value: 96 },
  { label: "Sun", value: 64 },
];

const DISTRICTS = [
  { name: "Bogura", gmv: 1_842_000, lots: 148, share: 100 },
  { name: "Faridpur", gmv: 1_204_000, lots: 96, share: 65 },
  { name: "Naogaon", gmv: 968_000, lots: 71, share: 52 },
  { name: "Rangpur", gmv: 640_000, lots: 54, share: 35 },
  { name: "Chattogram", gmv: 412_000, lots: 29, share: 22 },
];

const FEEDS = [
  { name: "Bogura mandi", state: "Live", ok: true, at: "08:00" },
  { name: "Faridpur mandi", state: "Live", ok: true, at: "08:00" },
  { name: "Naogaon mandi", state: "Late 42 min", ok: false, at: "08:42" },
  { name: "Rangpur mandi", state: "Live", ok: true, at: "08:00" },
  { name: "Bandarban", state: "No feed today", ok: false, at: "—" },
];

const ACTIVITY = [
  { who: "Nusrat (staff)", what: "released escrow on AK-4818", when: "08:41", tone: "green" },
  { who: "System", what: "published Bogura rates for 8 crops", when: "08:00", tone: "blue" },
  { who: "Tanvir (support)", what: "opened dispute D-118", when: "07:55", tone: "red" },
  { who: "Nusrat (staff)", what: "approved farmer Md. Anwar Hossain", when: "07:20", tone: "green" },
  { who: "Tanvir (support)", what: "suspended listing L8 — image mismatch", when: "Yesterday 18:02", tone: "red" },
  { who: "System", what: "rate feed from Naogaon arrived 42 min late", when: "Yesterday 08:42", tone: "amber" },
] as const;

const PROTOTYPE_USERS = [
  { id: "U1", name: "Sultana Begum", role: "Farmer", district: "Bogura", phone: "01711 004 442", status: "Verified", vol: 112, joined: "2011" },
  { id: "U2", name: "Rafiq Traders", role: "Buyer", district: "Dhaka", phone: "01712 004 556", status: "Verified", vol: 64, joined: "2019" },
  { id: "U3", name: "Md. Anwar Hossain", role: "Farmer", district: "Bogura", phone: "01733 991 087", status: "Pending", vol: 0, joined: "2024" },
  { id: "U4", name: "Chattogram Wholesale", role: "Buyer", district: "Chattogram", phone: "01818 220 190", status: "Verified", vol: 231, joined: "2016" },
  { id: "U5", name: "Jahanara Khatun", role: "Farmer", district: "Faridpur", phone: "01755 610 233", status: "Restricted", vol: 9, joined: "2022" },
  { id: "U6", name: "Nurul Islam", role: "Farmer", district: "Naogaon", phone: "01799 145 802", status: "Verified", vol: 63, joined: "2007" },
];

const DISPUTES = [
  { id: "D-118", order: "AK-4818", subject: "Quality below Grade A", buyer: "Rafiq Traders", farmer: "Sultana Begum", amount: 84_000, age: "19 h", sla: "due in 5 h", urgent: true, state: "Awaiting staff decision" },
  { id: "D-117", order: "AK-4802", subject: "Short weight — 3,2 mon missing", buyer: "Chattogram Wholesale", farmer: "Abdul Karim", amount: 45_600, age: "2 d", sla: "due in 22 h", urgent: false, state: "Photos requested" },
  { id: "D-115", order: "AK-4790", subject: "Late delivery, buyer wants refund", buyer: "Rafiq Traders", farmer: "Jahanara Khatun", amount: 139_200, age: "3 d", sla: "overdue 4 h", urgent: true, state: "Escrow frozen" },
];

const PERMISSIONS = [
  { area: "Release / refund escrow", super: true, support: false },
  { area: "Open and close disputes", super: true, support: true },
  { area: "Verify farmers", super: true, support: true },
  { area: "Suspend listings", super: true, support: true },
  { area: "Publish district rates", super: true, support: false },
  { area: "Restrict or delete a user", super: true, support: false },
  { area: "Change staff roles", super: true, support: false },
];

const STAFF = [
  { name: "Nusrat Jahan", mail: "nusrat@amarkrishok.com", role: "Super admin", last: "Active now" },
  { name: "Tanvir Ahmed", mail: "tanvir@amarkrishok.com", role: "Support agent", last: "12 min ago" },
  { name: "Shirin Akter", mail: "shirin@amarkrishok.com", role: "Support agent", last: "Yesterday" },
];

const PROTOTYPE_THREADS: ChatThread[] = [
  {
    id: "T1",
    participantName: "Sultana Begum",
    participantPhone: "01711 004 442",
    participantRole: "farmer",
    status: "waiting",
    subject: "AK-4821 · Potato Grade A · 120 mon",
    updatedAt: new Date().toISOString(),
    messages: [
      { id: "T1-1", createdAt: "08:12", senderName: "Sultana Begum", senderRole: "farmer", text: "The lot is loaded. Transporter leaves Bogura at 09:30." },
      { id: "T1-2", createdAt: "08:20", senderName: "AmarKrishok support", senderRole: "admin", text: "Good. Please send the weighbridge slip when you have it." },
      { id: "T1-3", createdAt: "08:41", senderName: "Sultana Begum", senderRole: "farmer", text: "Weighbridge shows 120,4 mon. Slip attached at the depot office." },
    ],
  },
  {
    id: "T2",
    participantName: "Rafiq Traders",
    participantPhone: "01712 004 556",
    participantRole: "buyer",
    status: "waiting",
    subject: "Dispute D-118 · quality claim",
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    messages: [
      { id: "T2-1", createdAt: "Yesterday", senderName: "Rafiq Traders", senderRole: "buyer", text: "Two sacks in AK-4818 were below Grade A. Can we hold part of the escrow?" },
      { id: "T2-2", createdAt: "07:55", senderName: "AmarKrishok support", senderRole: "admin", text: "Photos received. We propose a ৳ 4,200 partial refund — accept?" },
    ],
  },
  {
    id: "T3",
    participantName: "Chattogram Wholesale",
    participantPhone: "01818 220 190",
    participantRole: "buyer",
    status: "open",
    subject: "Tomato Grade B · 40 mon",
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    messages: [
      { id: "T3-1", createdAt: "Mon", senderName: "Chattogram Wholesale", senderRole: "buyer", text: "Can you hold the lot until Thursday?" },
      { id: "T3-2", createdAt: "Mon", senderName: "AmarKrishok support", senderRole: "admin", text: "Yes, until Thursday 18:00. After that it goes back on the market." },
    ],
  },
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

function activityColor(tone: (typeof ACTIVITY)[number]["tone"]) {
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
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [lots, setLots] = useState<BackendCropLot[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.accessToken) return;
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
  }, [user?.accessToken]);

  const hasLiveData = loaded && !loadError;
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
    ["GMV · today", money(hasLiveData ? gmv : 4_824_000), `${hasLiveData ? todaysOrders.length : 0} orders placed in this session`],
    ["Held in escrow", money(hasLiveData ? escrow : 19_400_000), "Median release 1 h 48 min"],
    ["Live listings", String(hasLiveData ? liveLots.length : 8), `${hasLiveData ? suspendedLots.length : 0} suspended by staff`],
    ["Needs a decision", String(hasLiveData ? pending : 2), `${hasLiveData ? disputes : 3} open disputes`],
    ["Payouts due today", money(486_300), "7 farmers · next batch 14:00"],
    ["New signups", String(hasLiveData ? signups : 38), "+12 % vs. last week"],
  ];

  const liveGrowth = GROWTH.map((entry, index) => {
    if (!hasLiveData) return { ...entry, height: entry.value };
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (6 - index));
    const end = start.getTime() + 86_400_000;
    const value = orders.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= start.getTime() && created < end;
    }).length;
    return { ...entry, value, height: value };
  });
  const growthPeak = Math.max(...liveGrowth.map((entry) => entry.height), 1);
  const chartGrowth = liveGrowth.map((entry) => ({ ...entry, height: hasLiveData ? Math.max(8, Math.round((entry.height / growthPeak) * 100)) : entry.height }));

  const liveDistricts = hasLiveData && orders.length
    ? Array.from(new Set([...lots.map((lot) => lot.district.name), ...orders.map((order) => order.district.name)]))
        .map((name) => ({
          name,
          gmv: orders.filter((order) => order.district.name === name && !isRefunded(order)).reduce((sum, order) => sum + orderValue(order), 0),
          lots: lots.filter((lot) => lot.district.name === name).length,
          share: 0,
        }))
        .sort((first, second) => second.gmv - first.gmv)
        .slice(0, 5)
    : DISTRICTS;
  const districtPeak = Math.max(...liveDistricts.map((district) => district.gmv), 1);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-kpis">
        {kpis.map(([label, value, detail], index) => (
          <article className={index === 3 ? "needs-decision" : ""} key={label}>
            <span>{t(label)}</span>
            <strong>{value}</strong>
            <small className={index === 5 ? "positive" : ""}>
              {index === 5 ? <TrendingUp aria-hidden="true" size={13} /> : null}
              {t(detail)}
            </small>
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
          {liveDistricts.map((district) => (
            <div className="admin-district-row" key={district.name}>
              <span><b>{t(district.name)}</b><small>{district.lots} {t("lots")}</small><em>{money(district.gmv)}</em></span>
              <i><b style={{ width: `${hasLiveData ? Math.round((district.gmv / districtPeak) * 100) : district.share}%` }} /></i>
            </div>
          ))}
        </article>

        <article className="admin-dashboard-panel feed-health">
          <strong>{t("Rate feed health")}</strong>
          {FEEDS.map((feed) => (
            <div key={feed.name}><i className={feed.ok ? "ok" : "bad"} /><span>{t(feed.name)}</span><em>{t(feed.state)}</em><small>{feed.at}</small></div>
          ))}
        </article>

        <article className="admin-dashboard-panel recent-activity">
          <strong>{t("Recent staff activity")}</strong>
          {ACTIVITY.map((activity) => (
            <div key={`${activity.when}-${activity.what}`}>
              <i style={{ background: activityColor(activity.tone) }} />
              <span><b>{t(activity.who)}</b> {t(activity.what)}</span><small>{activity.when}</small>
            </div>
          ))}
        </article>

        <article className="admin-dashboard-panel integrity">
          <strong>{t("Rate integrity")}</strong>
          <div><i className="good" /><span>{t("Listings within fair range")}</span><b>91 %</b></div>
          <div><i className="warn" /><span>{t("Above range, unsold > 7 days")}</span><b>6 %</b></div>
          <div><i className="danger" /><span>{t("Suspicious under-pricing")}</span><b>3 %</b></div>
          <p>{t("Districts missing today’s rate: Bandarban, Khagrachhari, Rangamati.")}</p>
        </article>
      </div>
    </div>
  );
}

export function AdminActivity() {
  const t = useTranslate();
  return (
    <div className="admin-activity-list">
      {ACTIVITY.map((activity) => (
        <div key={`${activity.when}-${activity.what}`}>
          <i style={{ background: activityColor(activity.tone) }} />
          <span><strong>{t(activity.who)}</strong> {t(activity.what)}</span>
          <time>{activity.when}</time>
        </div>
      ))}
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
  if (!registrations.length) {
    return PROTOTYPE_USERS.map((user) => ({ ...user, verified: user.status === "Verified" }));
  }

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
  onNavigate,
  onNotice,
  onOpenDocument,
  onSetVerified,
  onUpdateRegistration,
  registrations,
  staffRole,
}: {
  onNavigate: (section: AdminConsoleSection) => void;
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
                        {t("Open NID or land paper")}
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
  onNavigate,
  onNotice,
}: {
  onNavigate: (section: AdminConsoleSection) => void;
  onNotice: (message: string) => void;
}) {
  const t = useTranslate();
  const resolve = (message: string) => onNotice(message);
  return (
    <div className="admin-dispute-list">
      {DISPUTES.map((dispute) => (
        <article key={dispute.id}>
          <header><span><span><b>{dispute.id}</b><strong>{t(dispute.subject)}</strong><em className={dispute.urgent ? "urgent" : "calm"}>SLA {t(dispute.sla)}</em></span><small>{t("Order")} {dispute.order} · {t(dispute.buyer)} vs. {t(dispute.farmer)} · {t("opened")} {dispute.age} {t("ago")} · {t(dispute.state)}</small></span><span><strong>{money(dispute.amount)}</strong><small>{t("frozen in escrow")}</small></span></header>
          <footer>
            <button className="release" onClick={() => resolve(`${dispute.id} closed — escrow released to ${dispute.farmer}.`)} type="button">{t("Release to farmer")}</button>
            <button onClick={() => resolve(`${dispute.id} settled with a partial refund. Both sides notified by SMS.`)} type="button">{t("Partial refund")}</button>
            <button className="refund" onClick={() => resolve(`${dispute.id} closed — ${money(dispute.amount)} refunded to ${dispute.buyer}.`)} type="button">{t("Refund buyer")}</button>
            <button className="conversation" onClick={() => onNavigate("inbox")} type="button"><MessageSquare size={15} />{t("Open conversation")}</button>
          </footer>
        </article>
      ))}
    </div>
  );
}

function readableTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(parsed);
}

export function AdminInbox({ chatThreads, onAdminReply, onThreadOpen }: { chatThreads: ChatThread[]; onAdminReply: (threadId: string, text: string) => void; onThreadOpen: (threadId: string) => void }) {
  const t = useTranslate();
  const source = chatThreads.length ? chatThreads : PROTOTYPE_THREADS;
  const [activeId, setActiveId] = useState(source[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [demoMessages, setDemoMessages] = useState<Record<string, ChatMessage[]>>({});
  const active = source.find((thread) => thread.id === activeId) ?? source[0];

  useEffect(() => {
    if (active?.status === "waiting" && chatThreads.length) onThreadOpen(active.id);
  }, [active?.id, active?.status, chatThreads.length, onThreadOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!active || !text) return;
    if (chatThreads.length) onAdminReply(active.id, text);
    else setDemoMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), { id: `${active.id}-${Date.now()}`, createdAt: new Date().toISOString(), senderName: "AmarKrishok support", senderRole: "admin", text }] }));
    setDraft("");
  };

  if (!active) return <div className="admin-no-results"><span>{t("No conversations yet")}</span></div>;
  const messages = [...active.messages, ...(demoMessages[active.id] ?? [])];
  return (
    <div className="admin-inbox">
      <div className="admin-thread-list">
        {source.map((thread, index) => (
          <button className={thread.id === active.id ? "on" : ""} key={thread.id} onClick={() => setActiveId(thread.id)} type="button">
            <i>{initials(thread.participantName)}</i><span><strong>{t(thread.participantName)}{thread.status === "waiting" && index < 2 ? <em>{index + 1}</em> : null}</strong><small>{t(thread.subject)}</small></span><time>{readableTime(thread.updatedAt)}</time>
          </button>
        ))}
      </div>
      <section className="admin-conversation">
        <header><span><strong>{t(active.participantName)}</strong><small>{t(active.participantRole === "farmer" ? "Farmer" : active.participantRole === "buyer" ? "Buyer" : "Guest")} · {t(active.subject)}</small></span><em><Clock3 size={13} />{t("Reply due in 5 h")}</em></header>
        <div className="admin-message-list">
          {messages.map((message) => <div className={message.senderRole === "admin" ? "staff" : "participant"} key={message.id}><span>{message.text}</span><time>{readableTime(message.createdAt)}</time></div>)}
        </div>
        <form onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("Reply as AmarKrishok support")} /><button type="submit"><Send size={16} />{t("Reply")}</button></form>
      </section>
    </div>
  );
}

export function AdminRoles({ onNotice }: { onNotice: (message: string) => void }) {
  const t = useTranslate();
  return (
    <div className="admin-roles">
      <div className="admin-role-matrix">
        <div className="admin-role-head"><span>{t("Permission")}</span><span>{t("Super admin")}</span><span>{t("Support agent")}</span></div>
        {PERMISSIONS.map((permission) => <div className="admin-role-row" key={permission.area}><span>{t(permission.area)}</span><span>{permission.super ? <Check size={17} /> : <Minus size={17} />}</span><span>{permission.support ? <Check size={17} /> : <Minus size={17} />}</span></div>)}
      </div>
      <div className="admin-staff-accounts">
        <header><strong>{t("Staff accounts")}</strong><button onClick={() => onNotice("Staff invitation flow is ready for server-side role provisioning.")} type="button"><Plus size={15} />{t("Invite staff")}</button></header>
        {STAFF.map((staff) => <div key={staff.mail}><i>{initials(staff.name)}</i><span><strong>{t(staff.name)}</strong><small>{staff.mail}</small></span><em>{t(staff.role)}</em><time>{t(staff.last)}</time></div>)}
      </div>
    </div>
  );
}

export function SupportScopePill() {
  const t = useTranslate();
  return <span className="admin-support-scope"><Eye size={13} />{t("Support scope · escrow actions hidden")}</span>;
}
