import { apiRequest } from "./auth";

/**
 * Seller reviews. The server decides who may review what, so the client asks which farmers on an
 * order are still open to it rather than working that out from the order's shape.
 */

export type BackendReview = {
  id: string;
  orderId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { name: string };
};

export type BackendFarmerReputation = {
  rating: number | null;
  reviewCount: number;
  completedOrders: number;
};

export type ReviewableFarmer = {
  farmerId: string;
  name: string;
};

export function fetchReviewableFarmers(accessToken: string, orderId: string) {
  return apiRequest<{ reviewable: ReviewableFarmer[] }>(`/api/orders/${orderId}/reviewable`, { accessToken });
}

export function createReview(
  accessToken: string,
  orderId: string,
  payload: { farmerId: string; rating: number; comment?: string },
) {
  return apiRequest<BackendReview>(`/api/orders/${orderId}/reviews`, {
    accessToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function fetchFarmerReviews(farmerId: string) {
  return apiRequest<{ reputation: BackendFarmerReputation | null; reviews: BackendReview[] }>(
    `/api/farmers/${farmerId}/reviews`,
  );
}
