export type FairPriceTone = "blue" | "good" | "warn";

export function dhakaDateKey(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Dhaka",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function fairPriceDelta(askPoisha: number, ratePoisha: number | null | undefined) {
  if (!Number.isFinite(askPoisha) || !ratePoisha || ratePoisha <= 0) return null;
  return Math.round(((askPoisha / ratePoisha) - 1) * 100);
}

export function fairPriceVerdict(delta: number | null | undefined): { label: string; tone: FairPriceTone } | null {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return null;
  if (delta > 3) return { label: "দরের উপরে", tone: "warn" };
  if (delta < -8) return { label: "দরের নিচে", tone: "blue" };
  return { label: "ন্যায্য দাম", tone: "good" };
}

export function dhakaGreeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).format(now));
  if (hour < 12) return "শুভ সকাল";
  if (hour < 17) return "শুভ বিকেল";
  return "শুভ সন্ধ্যা";
}
