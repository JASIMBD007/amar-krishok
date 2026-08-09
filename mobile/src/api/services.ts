import * as Location from "expo-location";

import type { AppRole, AppUser, ListingSummary, TripState } from "../domain/types";
import type { PreparedPhoto } from "../media/images";
import { enqueueProof } from "../offline/proofQueue";
import { ApiError } from "./errors";
import { api } from "./runtime";

export type CarrierTrip = {
  destinationBn: string;
  earningsPoisha: number;
  id: string;
  listingLabel: string;
  originBn: string;
  state: TripState;
};

export const mobileApi = {
  acceptOffer: (offerId: string) =>
    api.request(`/offers/${offerId}/accept`, { method: "POST" }),

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
    api.request<{ orderId: string }>("/orders", {
      body: { listingId, quantityMon },
      idempotencyKey: `create-order:${listingId}:${quantityMon}`,
      method: "POST",
    }),

  getListings: () => api.request<ListingSummary[]>("/listings"),

  getRates: (crop: string, district: string) => api.request<{ date: string; price: number }[]>(`/rates?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}`),

  getMe: () => api.request<AppUser>("/me"),

  getMessages: (threadId: string) => api.request<{ authorId: string | null; body: string; createdAt: string; id: string }[]>(`/threads/${threadId}/messages`),

  getTrips: () => api.request<CarrierTrip[]>("/carrier/trips"),

  markNotificationRead: (notificationId: string) =>
    api.request(`/notifications/${notificationId}/read`, { method: "POST" }),

  placeBid: (jobId: string, amountPoisha: number) =>
    api.request(`/carrier/jobs/${jobId}/bid`, {
      body: { amountPoisha },
      idempotencyKey: `carrier-bid:${jobId}:${amountPoisha}`,
      method: "POST",
    }),

  requestListingPhotoUpload: (listingId: string, contentType: string, sizeBytes: number) =>
    api.request<{ uploadUrl: string; fileUrl: string; objectKey: string }>(`/listings/${listingId}/photos`, {
      body: { contentType, sizeBytes },
      idempotencyKey: `upload:${sizeBytes}:${contentType}`,
      method: "POST",
    }),

  commitListingPhoto: (listingId: string, objectKey: string, position: number) =>
    api.request(`/listings/${listingId}/photos`, { body: { objectKey, position }, method: "POST" }),

  publishListing: (listingId: string) => api.request(`/listings/${listingId}/publish`, { method: "POST" }),

  requestKycDocumentUpload: (kind: "NID_FRONT" | "NID_BACK" | "LAND", contentType: string, sizeBytes: number) =>
    api.request<{ uploadUrl: string; fileUrl: string; objectKey: string }>("/me/kyc/documents", {
      body: { contentType, kind, sizeBytes },
      idempotencyKey: `kyc-upload:${kind}:${sizeBytes}`,
      method: "POST",
    }),

  commitKycDocument: (kind: "NID_FRONT" | "NID_BACK" | "LAND", objectKey: string) =>
    api.request("/me/kyc/documents", {
      body: { kind, objectKey },
      idempotencyKey: `kyc-commit:${kind}:${objectKey}`,
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
    const body = {
        capturedAt: new Date().toISOString(),
        location: location
          ? { accuracy: location.coords.accuracy, latitude: location.coords.latitude, longitude: location.coords.longitude }
          : null,
        photoUris: photos.map((photo) => photo.uri),
        signature,
        weightMon,
      };
    const idempotencyKey = `pickup-proof:${tripId}:${weightMon}:${signature}`;
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
