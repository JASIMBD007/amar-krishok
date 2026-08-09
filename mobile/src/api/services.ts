import * as Location from "expo-location";

import type { AppRole, AppUser, ListingSummary, PlatformOrder, TripState } from "../domain/types";
import { photoToBase64, type PreparedPhoto } from "../media/images";
import { enqueueProof } from "../offline/proofQueue";
import { ApiError } from "./errors";
import { api } from "./runtime";

export type CarrierTrip = {
  deliverAt: string;
  distanceKm: number;
  fee: number;
  id: string;
  order: { code: string; id: string; listing: { crop: { nameBn: string }; grade: string }; quantity: number };
  pickupAt: string;
  state: TripState;
  stops: { address: string; district: { nameBn: string }; kind: "PICKUP" | "DELIVERY" }[];
};

export type ServiceDistrict = { id: string; nameBn: string; nameEn: string };
export type ServiceCrop = { id: string; nameBn: string; nameEn: string };

export const mobileApi = {
  acceptOffer: (offerId: string) =>
    api.request(`/offers/${offerId}/accept`, { method: "POST" }),

  declineOffer: (offerId: string) => api.request(`/offers/${offerId}/decline`, { method: "POST" }),

  acceptTrip: (tripId: string) =>
    api.request(`/carrier/trips/${tripId}/accept`, {
      idempotencyKey: `accept-trip:${tripId}`,
      method: "POST",
    }),

  confirmDelivery: (orderId: string) =>
    api.request(`/orders/${orderId}/confirm-delivery`, {
      idempotencyKey: `confirm-delivery:${orderId}`,
      method: "POST",
    }),

  createListing: (input: { cropId: string; districtId: string; grade: "A" | "B" | "C"; pickupWindow: string; pricePoisha: number; quantityMon: number }) =>
    api.request<{ id: string }>("/listings", { body: input, method: "POST" }),

  createOrder: (listingId: string, quantityMon: number) =>
    api.request<{ orderCode: string; orderId: string }>("/orders", {
      body: { listingId, quantityMon },
      idempotencyKey: `create-order:${listingId}:${quantityMon}`,
      method: "POST",
    }),

  getListings: () => api.request<ListingSummary[]>("/listings"),

  getCrops: () => api.request<ServiceCrop[]>("/crops", { auth: false }),

  getListing: (listingId: string) => api.request<ListingSummary>(`/listings/${listingId}`),

  getDistricts: () => api.request<ServiceDistrict[]>("/districts", { auth: false }),

  getRates: (crop: string, district: string) => api.request<{ date: string; price: number }[]>(`/rates?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}`),

  getMe: () => api.request<AppUser>("/me"),

  getNotificationPrefs: () => api.request<{ appAll: boolean; smsOrders: boolean; smsRates: boolean; weeklyDigest: boolean }>("/me/notification-prefs"),

  updateNotificationPrefs: (input: { appAll?: boolean; smsOrders?: boolean; smsRates?: boolean; weeklyDigest?: boolean }) => api.request("/me/notification-prefs", { body: input, method: "PATCH" }),

  getPayoutAccount: () => api.request<{ accountNo: string; method: "BKASH" | "NAGAD" | "BANK" } | null>("/me/payout-account"),

  setPayoutAccount: (accountNo: string, method: "BKASH" | "NAGAD" | "BANK") => api.request("/me/payout-account", { body: { accountNo, method }, method: "PUT" }),

  updatePin: (currentPin: string, newPin: string) => api.request("/me/pin", { body: { currentPin, newPin }, method: "PATCH" }),

  getOrders: () => api.request<PlatformOrder[]>("/orders"),

  getOrder: (orderId: string) => api.request<PlatformOrder>(`/orders/${orderId}`),

  getDeskSummary: () => api.request<{ escrowPoisha: number; focusRate: { cropBn: string; delta: number | null; districtBn: string; pricePoisha: number } | null; listings: ListingSummary[]; liveLots: number; monthlyEarningsPoisha: number; openOffers: number }>("/desk/summary"),

  getOffers: () => api.request<{ buyer: { name: string }; id: string; listing: { crop: { nameBn: string }; grade: string }; price: number; quantity: number; status: string }[]>("/desk/offers"),

  getFarmerPayouts: () => api.request<{ amount: number; id: string; state: string }[]>("/payouts"),

  createOffer: (listingId: string, pricePoisha: number, quantityMon: number) => api.request("/offers", { body: { listingId, pricePoisha, quantityMon }, method: "POST" }),

  createDispute: (orderId: string, subject: string) => api.request(`/orders/${orderId}/dispute`, { body: { subject }, method: "POST" }),

  getMessages: (threadId: string) => api.request<{ authorId: string | null; body: string; createdAt: string; id: string }[]>(`/threads/${threadId}/messages`),

  getTrips: () => api.request<CarrierTrip[]>("/carrier/trips"),

  getTrip: (tripId: string) => api.request<CarrierTrip>(`/carrier/trips/${tripId}`),

  getCarrierJobs: () => api.request<{ bids: { amount: number }[]; deliverAt: string; distanceKm: number; fee: number; id: string; order: { listing: { crop: { nameBn: string } }; quantity: number }; pickupAt: string; stops: { address: string; district: { nameBn: string }; kind: "PICKUP" | "DELIVERY" }[] }[]>("/carrier/jobs"),

  getCarrierEarnings: () => api.request<{ ledger: { amount: number; createdAt: string; id: string; state: string; trip: { id: string } }[]; pendingPoisha: number; weekPoisha: number; withdrawablePoisha: number }>("/carrier/earnings"),

  setCarrierOnline: (online: boolean) => api.request("/carrier/online", { body: { online }, method: "PATCH" }),

  declineTrip: (tripId: string) => api.request(`/carrier/trips/${tripId}/decline`, { method: "POST" }),

  startTrip: (tripId: string) => api.request(`/carrier/trips/${tripId}/start`, { method: "POST" }),

  arriveTrip: (tripId: string) => api.request(`/carrier/trips/${tripId}/arrive`, { method: "POST" }),

  getNotifications: (category?: "ORDER" | "PAYOUT" | "RATE" | "SYSTEM") => api.request<{ body: string; category: string; id: string; readAt: string | null; sentAt: string; title: string; tone: string }[]>(`/notifications${category ? `?category=${category}` : ""}`),

  markAllNotificationsRead: () => api.request("/notifications/read-all", { method: "POST" }),

  getThreads: () => api.request<{ id: string; kind: "DIRECT" | "SUPPORT"; messages: { body: string; createdAt: string }[]; subject: string }[]>("/threads"),

  markNotificationRead: (notificationId: string) =>
    api.request(`/notifications/${notificationId}/read`, { method: "POST" }),

  placeBid: (jobId: string, amountPoisha: number) =>
    api.request(`/carrier/jobs/${jobId}/bid`, {
      body: { amountPoisha },
      idempotencyKey: `carrier-bid:${jobId}:${amountPoisha}`,
      method: "POST",
    }),

  uploadListingPhoto: async (listingId: string, photo: PreparedPhoto, position: number) =>
    api.request(`/listings/${listingId}/photos`, {
      body: { contentType: "image/jpeg", dataBase64: await photoToBase64(photo), position, sizeBytes: photo.sizeBytes },
      idempotencyKey: `listing-photo:${listingId}:${position}:${photo.sizeBytes}`,
      method: "POST",
    }),

  publishListing: (listingId: string) => api.request(`/listings/${listingId}/publish`, { method: "POST" }),

  pauseListing: (listingId: string) => api.request(`/listings/${listingId}/pause`, { method: "POST" }),

  uploadKycDocument: async (kind: "NID_FRONT" | "NID_BACK" | "LAND", photo: PreparedPhoto) =>
    api.request("/me/kyc/documents", {
      body: { contentType: "image/jpeg", dataBase64: await photoToBase64(photo), kind, sizeBytes: photo.sizeBytes },
      idempotencyKey: `kyc-document:${kind}:${photo.sizeBytes}`,
      method: "POST",
    }),

  sendMessage: (threadId: string, body: string) =>
    api.request(`/threads/${threadId}/messages`, { body: { body }, method: "POST" }),

  submitPickupProof: async ({
    photos,
    signature,
    tripId,
    weightMon,
  }: {
    photos: PreparedPhoto[];
    signature: string;
    tripId: string;
    weightMon: number;
  }) => {
    const permission = await Location.requestForegroundPermissionsAsync();
    const location = permission.granted
      ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      : null;
    const preparedPhotos = await Promise.all(photos.map(async (photo) => {
      return { dataBase64: await photoToBase64(photo), mimeType: "image/jpeg" };
    }));
    const capturedAt = new Date().toISOString();
    const body = {
        capturedAt,
        location: location
          ? { accuracy: location.coords.accuracy, latitude: location.coords.latitude, longitude: location.coords.longitude }
          : null,
        photos: preparedPhotos,
        signature,
        weightMon,
      };
    const idempotencyKey = `pickup-proof:${tripId}:${capturedAt}`;
    try {
      return await api.request(`/carrier/trips/${tripId}/proof`, { body, idempotencyKey, method: "POST" });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      await enqueueProof({ body, idempotencyKey, tripId });
      return { queued: true };
    }
  },

  updateLocation: (tripId: string, latitude: number, longitude: number) =>
    api.request(`/carrier/trips/${tripId}/location`, {
      body: { at: new Date().toISOString(), lat: latitude, lng: longitude },
      method: "POST",
    }),

  withdrawCarrierEarnings: (amountPoisha: number) =>
    api.request("/carrier/withdraw", {
      body: { amountPoisha },
      idempotencyKey: `carrier-withdraw:${amountPoisha}`,
      method: "POST",
    }),

  updateProfile: (input: Pick<AppUser, "name" | "district">) =>
    api.request<AppUser>("/me", { body: input, method: "PATCH" }),
};

export function roleLabel(role: AppRole) {
  if (role === "FARMER") return "কৃষক";
  if (role === "BUYER") return "ক্রেতা";
  return "পরিবহন অংশীদার";
}
