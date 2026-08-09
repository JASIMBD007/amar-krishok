export const displayTimeZone = "Asia/Dhaka" as const;

function groupIndianDigits(digits: string) {
  if (digits.length <= 3) return digits;

  const finalGroup = digits.slice(-3);
  const leadingDigits = digits.slice(0, -3);
  const leadingGroups: string[] = [];

  for (let end = leadingDigits.length; end > 0; end -= 2) {
    leadingGroups.unshift(leadingDigits.slice(Math.max(0, end - 2), end));
  }

  return `${leadingGroups.join(",")},${finalGroup}`;
}

export function formatMoneyFromPoisha(poisha: number) {
  if (!Number.isSafeInteger(poisha)) {
    throw new TypeError("Money must be supplied as integer poisha.");
  }

  const sign = poisha < 0 ? "−" : "";
  const absolutePoisha = Math.abs(poisha).toString().padStart(3, "0");
  const takaDigits = absolutePoisha.slice(0, -2);
  const poishaDigits = absolutePoisha.slice(-2);
  const fraction = poishaDigits === "00" ? "" : `.${poishaDigits}`;

  return `${sign}৳ ${groupIndianDigits(takaDigits)}${fraction}`;
}

export function formatDhakaTimestamp(utcTimestamp: string | Date) {
  const date = utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) throw new TypeError("Timestamp must be valid UTC input.");

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: displayTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("day")} ${value("month")} ${value("year")}, ${value("hour")}:${value("minute")}`;
}
