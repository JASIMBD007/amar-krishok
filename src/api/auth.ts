import type { AccountStatus, AuthUser, RegisteredAccount, RegistrationRole, Role } from "../types";

const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:4000"
  : "https://amar-krishok-api.onrender.com";

type ApiRole = "ADMIN" | "BUYER" | "FARMER";
type ApiAccountStatus = "PENDING" | "ACTIVE" | "REJECTED";

type ApiUser = {
  id: string;
  name: string;
  phone: string;
  username: string;
  role: ApiRole;
  status?: ApiAccountStatus;
  organization?: string | null;
  address?: string | null;
  identity?: string | null;
  focus?: string | null;
  upazilla?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  district?: {
    name: string;
  } | null;
  _count?: {
    cropLots?: number;
    orders?: number;
  };
  cropLots?: Array<{
    createdAt?: string;
    crop: { name: string };
    district: { name: string };
    upazilla?: string | null;
    grade: string;
    harvestDate?: string | null;
    id: string;
    imageUrl?: string | null;
    notes?: string | null;
    pricePerKg: string | number;
    quantityKg: string | number;
    status: string;
    updatedAt?: string;
  }>;
  orders?: Array<{
    deliveryAddress: string;
    district: { name: string };
    upazilla?: string | null;
    id: string;
    items: Array<{ crop: { name: string }; quantityKg: string | number }>;
    status: string;
    totalValue: string | number;
  }>;
};

type LoginResponse = {
  accessToken: string;
  user: ApiUser;
};

type PasswordResetResponse = {
  message?: string;
};

type ApiPasswordResetStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminPasswordResetRequest = {
  id: string;
  phone: string;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: { id: string; name: string } | null;
  role: RegistrationRole;
  status: "pending" | "approved" | "rejected";
  user: {
    district: string;
    id: string;
    name: string;
    organization: string;
    phone: string;
    role: RegistrationRole;
    status: AccountStatus;
    upazilla: string;
    username: string;
  };
};

type ApiPasswordResetRequest = {
  id: string;
  phone: string;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: { id: string; name: string } | null;
  role: ApiRole;
  status: ApiPasswordResetStatus;
  user: Pick<ApiUser, "id" | "name" | "organization" | "phone" | "role" | "status" | "upazilla" | "username" | "district">;
};

type ApiLotFarmer = Omit<ApiUser, "phone"> & {
  phone?: string;
};

export type BackendCropLot = {
  id: string;
  crop: { name: string };
  district: { name: string };
  upazilla: string | null;
  farmer: ApiLotFarmer;
  grade: string;
  harvestDate: string | null;
  imageUrl: string | null;
  notes: string | null;
  pricePerKg: string | number;
  quantityKg: string | number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCropLotPayload = {
  crop: string;
  district: string;
  upazilla: string;
  grade: string;
  harvestDate?: string;
  imageUrl?: string;
  notes?: string;
  pricePerKg: number;
  quantityKg: number;
};

export type BackendOrderItem = {
  id: string;
  crop: { name: string };
  cropLotId: string | null;
  offeredPricePerKg: string | number;
  quantityKg: string | number;
};

export type BackendOrder = {
  id: string;
  buyer: ApiUser;
  createdAt: string;
  deliveryAddress: string;
  district: { name: string };
  upazilla: string | null;
  items: BackendOrderItem[];
  notes: string | null;
  status: string;
  targetDate: string | null;
  totalValue: string | number;
  updatedAt: string;
};

export type CreateOrderPayload = {
  buyerId?: string;
  deliveryAddress: string;
  district: string;
  upazilla: string;
  items: Array<{
    crop: string;
    cropLotId?: string;
    offeredPricePerKg: number;
    quantityKg: number;
  }>;
  notes?: string;
  targetDate?: string;
};

export type UpdateProfilePayload = {
  address: string;
  district: string;
  upazilla: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
};

export type AdminAccountPayload = UpdateProfilePayload & {
  password?: string;
  phone: string;
  role: RegistrationRole;
  status: AccountStatus;
  username: string;
};

export type BackendNotification = {
  body: string;
  createdAt: string;
  id: string;
  meta: string;
  readAt: string | null;
  section: string;
  title: string;
  tone: string;
  type: string;
};
export type BackendAdminNotification = BackendNotification;

export type BackendUploadedFile = {
  createdAt: string;
  id: string;
  key: string;
  mimeType: string;
  ownerId: string | null;
  size: number;
  url: string;
};

type RegisterAccountPayload = {
  address: string;
  district: string;
  upazilla: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  role: RegistrationRole;
  username: string;
};

const apiRoleToAppRole: Record<ApiRole, Role> = {
  ADMIN: "admin",
  BUYER: "buyer",
  FARMER: "farmer",
};

const appRoleToApiRole: Record<Role, ApiRole> = {
  admin: "ADMIN",
  buyer: "BUYER",
  farmer: "FARMER",
};

const apiStatusToAccountStatus: Record<ApiAccountStatus, AccountStatus> = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
};

const apiPasswordResetStatusToAppStatus: Record<ApiPasswordResetStatus, AdminPasswordResetRequest["status"]> = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
};

function numericValue(value: string | number | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRequestError";
  }
}

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function readApiMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message) ? body.message[0] : body.message;
  } catch {
    return undefined;
  }
}

async function apiRequest<T>(path: string, options: RequestInit & { accessToken?: string } = {}) {
  const { accessToken, headers, ...requestOptions } = options;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiRequestError("Backend service is unavailable. Please try again.");
  }

  if (!response.ok) {
    throw new ApiRequestError((await readApiMessage(response)) ?? "Backend request failed.", response.status);
  }

  return (await response.json()) as T;
}

function toAuthUser(data: LoginResponse): AuthUser {
  return {
    accessToken: data.accessToken,
    accountId: data.user.id,
    name: data.user.name,
    phone: data.user.phone,
    role: apiRoleToAppRole[data.user.role],
    signedInAt: new Date().toISOString(),
    username: data.user.username ?? data.user.phone,
  };
}

export function toRegisteredAccount(user: ApiUser): RegisteredAccount {
  const latestOrder = user.orders?.[0];
  const latestLot = user.cropLots?.[0];
  return {
    address: user.address ?? "",
    cropLots:
      user.cropLots?.map((lot) => ({
        createdAt: lot.createdAt,
        crop: lot.crop.name,
        district: lot.district.name,
        grade: lot.grade,
        harvestDate: lot.harvestDate ?? undefined,
        id: lot.id,
        imageUrl: lot.imageUrl ?? undefined,
        notes: lot.notes ?? undefined,
        pricePerKg: numericValue(lot.pricePerKg),
        quantityKg: numericValue(lot.quantityKg),
        status: lot.status,
        upazilla: lot.upazilla ?? undefined,
        updatedAt: lot.updatedAt,
      })) ?? [],
    cropLotCount: user._count?.cropLots ?? user.cropLots?.length ?? 0,
    cropLotQuantityKg: user.cropLots?.reduce((total, lot) => total + numericValue(lot.quantityKg), 0) ?? 0,
    district: user.district?.name ?? "",
    upazilla: user.upazilla ?? "",
    focus: user.focus ?? "",
    id: user.id,
    identity: user.identity ?? "",
    latestLotStatus: latestLot?.status,
    latestLotSummary: latestLot ? `${latestLot.crop.name} · ${latestLot.upazilla || latestLot.district.name}` : undefined,
    latestOrderStatus: latestOrder?.status,
    latestOrderSummary: latestOrder ? `${latestOrder.id} · ${latestOrder.upazilla || latestOrder.deliveryAddress}` : undefined,
    name: user.name,
    orderCount: user._count?.orders ?? user.orders?.length ?? 0,
    orderValue: user.orders?.reduce((total, order) => total + numericValue(order.totalValue), 0) ?? 0,
    organization: user.organization ?? "",
    password: "",
    phone: user.phone,
    username: user.username ?? user.phone,
    reviewedAt: user.reviewedAt ?? undefined,
    role: apiRoleToAppRole[user.role] as RegistrationRole,
    status: user.status ? apiStatusToAccountStatus[user.status] : "pending",
    submittedAt: user.createdAt ?? new Date().toISOString(),
  };
}

function toAdminPasswordResetRequest(request: ApiPasswordResetRequest): AdminPasswordResetRequest {
  return {
    id: request.id,
    phone: request.phone,
    requestedAt: request.requestedAt,
    reviewedAt: request.reviewedAt,
    reviewedBy: request.reviewedBy,
    role: apiRoleToAppRole[request.role] as RegistrationRole,
    status: apiPasswordResetStatusToAppStatus[request.status],
    user: {
      district: request.user.district?.name ?? "",
      id: request.user.id,
      name: request.user.name,
      organization: request.user.organization ?? "",
      phone: request.user.phone,
      role: apiRoleToAppRole[request.user.role] as RegistrationRole,
      status: request.user.status ? apiStatusToAccountStatus[request.user.status] : "pending",
      upazilla: request.user.upazilla ?? "",
      username: request.user.username ?? request.user.phone,
    },
  };
}

export async function loginWithApi({
  accountType,
  identifier,
  password,
}: {
  accountType: Role;
  identifier: string;
  password: string;
}) {
  try {
    const role = appRoleToApiRole[accountType];
    return toAuthUser(await apiRequest<LoginResponse>("/api/auth/login", {
      body: JSON.stringify({
        password,
        role,
        ...(accountType === "admin" ? { username: identifier } : { phone: identifier }),
      }),
      method: "POST",
    }));
  } catch (error) {
    if (!(error instanceof ApiRequestError)) {
      throw new AuthRequestError("Login service is unavailable. Please try again.");
    }

    const message = error.message;
    if (message === "Account is waiting for admin verification.") {
      throw new AuthRequestError(message);
    }

    if (error.status === 401 || error.status === 400) {
      throw new AuthRequestError(accountType === "admin" ? "Username or password is incorrect." : "Mobile number or password is incorrect.");
    }

    throw new AuthRequestError(message || "Login service is unavailable. Please try again.");
  }
}

export async function requestAccountPasswordReset({
  password,
  phone,
  role,
}: {
  password: string;
  phone: string;
  role: RegistrationRole;
}) {
  try {
    const apiRole = appRoleToApiRole[role];
    return await apiRequest<PasswordResetResponse>("/api/auth/password-reset/request", {
      body: JSON.stringify({ password, phone, role: apiRole }),
      method: "POST",
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError)) {
      throw new AuthRequestError("Password reset service is unavailable. Please try again.");
    }

    throw new AuthRequestError(error.message || "Password reset service is unavailable. Please try again.");
  }
}

export async function registerAccountWithApi({ role, ...payload }: RegisterAccountPayload) {
  const path = role === "buyer" ? "/api/auth/register/buyer" : "/api/auth/register/farmer";
  const response = await apiRequest<{ message: string; user: ApiUser }>(path, {
    body: JSON.stringify(payload),
    method: "POST",
  });

  return toRegisteredAccount(response.user);
}

export function fetchMyCropLots(accessToken: string) {
  return apiRequest<BackendCropLot[]>("/api/lots/mine", { accessToken });
}

export function createCropLot(accessToken: string, payload: CreateCropLotPayload) {
  return apiRequest<BackendCropLot>("/api/lots", {
    accessToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function fetchMyOrders(accessToken: string) {
  return apiRequest<BackendOrder[]>("/api/orders", { accessToken });
}

export function createBuyerOrder(accessToken: string, payload: CreateOrderPayload) {
  return apiRequest<BackendOrder>("/api/orders", {
    accessToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export async function fetchMyProfile(accessToken: string) {
  return toRegisteredAccount(await apiRequest<ApiUser>("/api/account/me", { accessToken }));
}

export async function updateMyProfile(accessToken: string, payload: UpdateProfilePayload) {
  return toRegisteredAccount(await apiRequest<ApiUser>("/api/account/me", {
    accessToken,
    body: JSON.stringify(payload),
    method: "PATCH",
  }));
}

export async function uploadFile(accessToken: string, file: File, purpose: "crop-lot-image" | "identity-document") {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/uploads`, {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    });
  } catch {
    throw new ApiRequestError("Backend service is unavailable. Please try again.");
  }

  if (!response.ok) {
    throw new ApiRequestError((await readApiMessage(response)) ?? "File upload failed.", response.status);
  }

  const uploadedFile = (await response.json()) as BackendUploadedFile;
  return {
    ...uploadedFile,
    url: uploadedFile.url.startsWith("http") ? uploadedFile.url : `${API_BASE_URL}${uploadedFile.url}`,
  };
}

export async function fetchPendingVerifications(accessToken: string) {
  const users = await apiRequest<ApiUser[]>("/api/admin/verifications", { accessToken });
  return users.map(toRegisteredAccount).filter((account) => account.role === "buyer" || account.role === "farmer");
}

export async function fetchAdminAccounts(accessToken: string, role?: RegistrationRole) {
  const params = new URLSearchParams();
  if (role) {
    params.set("role", role);
  }

  const query = params.toString();
  const users = await apiRequest<ApiUser[]>(`/api/admin/accounts${query ? `?${query}` : ""}`, { accessToken });
  return users.map(toRegisteredAccount).filter((account) => account.role === "buyer" || account.role === "farmer");
}

export function fetchAdminNotifications(accessToken: string) {
  return apiRequest<BackendAdminNotification[]>("/api/admin/notifications", { accessToken });
}

export function markAdminNotificationRead(accessToken: string, id: string) {
  return apiRequest<BackendAdminNotification>(`/api/admin/notifications/${id}/read`, {
    accessToken,
    method: "PATCH",
  });
}

export function markAllAdminNotificationsRead(accessToken: string) {
  return apiRequest<{ count: number }>("/api/admin/notifications/read-all", {
    accessToken,
    method: "PATCH",
  });
}

export async function fetchAdminPasswordResetRequests(accessToken: string) {
  const requests = await apiRequest<ApiPasswordResetRequest[]>("/api/admin/password-resets", { accessToken });
  return requests.map(toAdminPasswordResetRequest);
}

export async function approveAdminPasswordResetRequest(accessToken: string, id: string) {
  return toAdminPasswordResetRequest(
    await apiRequest<ApiPasswordResetRequest>(`/api/admin/password-resets/${id}/approve`, {
      accessToken,
      method: "PATCH",
    }),
  );
}

export async function rejectAdminPasswordResetRequest(accessToken: string, id: string) {
  return toAdminPasswordResetRequest(
    await apiRequest<ApiPasswordResetRequest>(`/api/admin/password-resets/${id}/reject`, {
      accessToken,
      method: "PATCH",
    }),
  );
}

export function fetchNotifications(accessToken: string) {
  return apiRequest<BackendNotification[]>("/api/notifications", { accessToken });
}

export function markNotificationRead(accessToken: string, id: string) {
  return apiRequest<BackendNotification>(`/api/notifications/${id}/read`, {
    accessToken,
    method: "PATCH",
  });
}

export function markAllNotificationsRead(accessToken: string) {
  return apiRequest<{ count: number }>("/api/notifications/read-all", {
    accessToken,
    method: "PATCH",
  });
}

export async function createAdminAccount(accessToken: string, payload: AdminAccountPayload) {
  const user = await apiRequest<ApiUser>("/api/admin/accounts", {
    accessToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
  return toRegisteredAccount(user);
}

export async function updateAdminAccount(accessToken: string, id: string, payload: Partial<AdminAccountPayload>) {
  const user = await apiRequest<ApiUser>(`/api/admin/accounts/${id}`, {
    accessToken,
    body: JSON.stringify(payload),
    method: "PATCH",
  });
  return toRegisteredAccount(user);
}

export async function deleteAdminAccount(accessToken: string, id: string) {
  return apiRequest<{ id: string }>(`/api/admin/accounts/${id}`, {
    accessToken,
    method: "DELETE",
  });
}

export async function updateBackendVerification(accessToken: string, id: string, status: AccountStatus) {
  const action = status === "active" ? "approve" : "reject";
  const user = await apiRequest<ApiUser>(`/api/admin/verifications/${id}/${action}`, {
    accessToken,
    method: "PATCH",
  });
  return toRegisteredAccount(user);
}
