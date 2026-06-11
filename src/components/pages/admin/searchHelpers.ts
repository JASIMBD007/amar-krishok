import type { AdminPasswordResetRequest } from "../../../api/auth";
import type { ChatThread, RegisteredAccount, RegisteredCropLotRecord } from "../../../types";
import { matchesSearch, type SearchableValue } from "../../../utils/search";
import type { Translator } from "../../shared";

function withTranslations(t: Translator, values: SearchableValue[]) {
  return values.flatMap((value) => (typeof value === "string" ? [value, t(value)] : value));
}

function lotSearchValues(lot: RegisteredCropLotRecord): SearchableValue[] {
  return [
    lot.id,
    lot.crop,
    lot.district,
    lot.upazilla,
    lot.grade,
    lot.harvestDate,
    lot.notes,
    lot.pricePerKg,
    lot.quantityKg,
    lot.status,
    lot.createdAt,
    lot.updatedAt,
  ];
}

export function accountMatchesSearch(query: string, account: RegisteredAccount, t: Translator) {
  return matchesSearch(
    query,
    withTranslations(t, [
      account.id,
      account.name,
      account.phone,
      account.username,
      account.role,
      account.role === "buyer" ? "Buyer" : "Seller / Farmer",
      account.status,
      account.organization,
      account.district,
      account.upazilla,
      account.address,
      account.identity,
      account.focus,
      account.submittedAt,
      account.reviewedAt,
      account.cropLotCount,
      account.cropLotQuantityKg,
      account.latestLotStatus,
      account.latestLotSummary,
      account.orderCount,
      account.orderValue,
      account.latestOrderStatus,
      account.latestOrderSummary,
      account.cropLots?.map(lotSearchValues),
    ]),
  );
}

export function chatThreadMatchesSearch(query: string, thread: ChatThread, t: Translator) {
  return matchesSearch(
    query,
    withTranslations(t, [
      thread.id,
      thread.participantName,
      thread.participantPhone,
      thread.participantRole,
      thread.participantRole === "buyer" ? "Buyer" : thread.participantRole === "farmer" ? "Seller / Farmer" : "Guest",
      thread.status,
      thread.subject,
      thread.updatedAt,
      thread.messages.map((message) => [message.senderName, message.senderRole, message.text, message.createdAt]),
    ]),
  );
}

export function passwordResetRequestMatchesSearch(query: string, request: AdminPasswordResetRequest, t: Translator) {
  return matchesSearch(
    query,
    withTranslations(t, [
      request.id,
      request.phone,
      request.role,
      request.role === "buyer" ? "Buyer" : "Seller / Farmer",
      request.status,
      request.requestedAt,
      request.reviewedAt,
      request.reviewedBy?.name,
      request.user.id,
      request.user.name,
      request.user.username,
      request.user.phone,
      request.user.organization,
      request.user.district,
      request.user.upazilla,
      request.user.status,
    ]),
  );
}
