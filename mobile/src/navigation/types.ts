export type RootStackParamList = {
  AppTabs: undefined;
  Chat: { threadId?: string } | undefined;
  Kyc: undefined;
  LotDetail: { listingId: string };
  Notifications: undefined;
  OrderTracking: { orderId?: string } | undefined;
  PickupProof: { tripId?: string } | undefined;
  PostCrop: undefined;
};
