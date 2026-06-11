import type { AccountProfile, AuthUser, CreateLotPayload, CreateOrderPayload, CropLot, District, Order, RegisterPayload, Role } from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://amar-krishok-api.onrender.com";

type ApiRole = "ADMIN" | "BUYER" | "FARMER";
type ApiUser = {
  address?: string | null;
  district?: { name: string } | null;
  focus?: string | null;
  id: string;
  identity?: string | null;
  name: string;
  organization?: string | null;
  phone: string;
  role: ApiRole;
  status?: "ACTIVE" | "PENDING" | "REJECTED";
  upazilla?: string | null;
  username?: string | null;
};

type ApiLot = {
  createdAt: string;
  crop: { name: string };
  district: { name: string };
  farmer: ApiUser;
  grade: string;
  harvestDate?: string | null;
  id: string;
  imageUrl?: string | null;
  notes?: string | null;
  pricePerKg: string | number;
  quantityKg: string | number;
  status: string;
  upazilla?: string | null;
};

type ApiOrder = {
  createdAt: string;
  deliveryAddress: string;
  district: { name: string };
  id: string;
  items: Array<{
    crop: { name: string };
    cropLotId?: string | null;
    offeredPricePerKg: string | number;
    quantityKg: string | number;
  }>;
  notes?: string | null;
  status: string;
  targetDate?: string | null;
  totalValue: string | number;
  upazilla?: string | null;
};

type UploadedFile = {
  url: string;
};

const roleToApi: Record<Role, ApiRole> = {
  admin: "ADMIN",
  buyer: "BUYER",
  farmer: "FARMER",
};

const apiToRole: Record<ApiRole, Role> = {
  ADMIN: "admin",
  BUYER: "buyer",
  FARMER: "farmer",
};

function numberValue(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message) ? body.message[0] : body.message;
  } catch {
    return undefined;
  }
}

async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error("Backend service is unavailable.");
  }

  if (!response.ok) {
    throw new Error((await readMessage(response)) || "Request failed.");
  }

  return (await response.json()) as T;
}

function toProfile(user: ApiUser): AccountProfile {
  return {
    address: user.address || "",
    district: user.district?.name || "",
    focus: user.focus || "",
    id: user.id,
    identity: user.identity || "",
    name: user.name,
    organization: user.organization || "",
    phone: user.phone,
    role: apiToRole[user.role],
    status: user.status === "ACTIVE" ? "active" : user.status === "REJECTED" ? "rejected" : "pending",
    upazilla: user.upazilla || "",
    username: user.username || user.phone,
  };
}

function toLot(lot: ApiLot): CropLot {
  return {
    crop: lot.crop.name,
    createdAt: lot.createdAt,
    district: lot.district.name,
    farmer: lot.farmer.name,
    grade: lot.grade,
    harvestDate: lot.harvestDate,
    id: lot.id,
    imageUrl: lot.imageUrl,
    notes: lot.notes,
    phone: lot.farmer.phone,
    pricePerKg: numberValue(lot.pricePerKg),
    quantityKg: numberValue(lot.quantityKg),
    status: lot.status,
    upazilla: lot.upazilla,
  };
}

function toOrder(order: ApiOrder): Order {
  return {
    createdAt: order.createdAt,
    deliveryAddress: order.deliveryAddress,
    district: order.district.name,
    id: order.id,
    items: order.items.map((item) => ({
      crop: item.crop.name,
      cropLotId: item.cropLotId,
      offeredPricePerKg: numberValue(item.offeredPricePerKg),
      quantityKg: numberValue(item.quantityKg),
    })),
    notes: order.notes,
    status: order.status,
    targetDate: order.targetDate,
    totalValue: numberValue(order.totalValue),
    upazilla: order.upazilla,
  };
}

export async function login(role: Role, identifier: string, password: string): Promise<AuthUser> {
  const apiRole = roleToApi[role];
  const response = await apiRequest<{ accessToken: string; user: ApiUser }>("/api/auth/login", {
    body: JSON.stringify({
      password,
      role: apiRole,
      ...(role === "admin" ? { username: identifier } : { phone: identifier }),
    }),
    method: "POST",
  });

  return {
    accessToken: response.accessToken,
    id: response.user.id,
    name: response.user.name,
    phone: response.user.phone,
    role: apiToRole[response.user.role],
    username: response.user.username || response.user.phone,
  };
}

export async function registerAccount(payload: RegisterPayload) {
  const path = payload.role === "buyer" ? "/api/auth/register/buyer" : "/api/auth/register/farmer";
  const { role, ...body } = payload;
  const response = await apiRequest<{ user: ApiUser }>(path, {
    body: JSON.stringify(body),
    method: "POST",
  });
  return toProfile(response.user);
}

export async function requestPasswordReset(role: Exclude<Role, "admin">, phone: string, password: string) {
  return apiRequest<{ message?: string }>("/api/auth/password-reset/request", {
    body: JSON.stringify({ password, phone, role: roleToApi[role] }),
    method: "POST",
  });
}

export async function fetchDistricts() {
  const districts = await apiRequest<District[]>("/api/districts");
  return districts.map((district) => district.name);
}

export async function fetchPublicLots(filters: { crop?: string; district?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.crop) params.set("crop", filters.crop);
  if (filters.district) params.set("district", filters.district);
  const query = params.toString();
  const lots = await apiRequest<ApiLot[]>(`/api/lots${query ? `?${query}` : ""}`);
  return lots.map(toLot);
}

export async function fetchMyLots(token: string) {
  const lots = await apiRequest<ApiLot[]>("/api/lots/mine", { token });
  return lots.map(toLot);
}

export async function createLot(token: string, payload: CreateLotPayload) {
  const lot = await apiRequest<ApiLot>("/api/lots", {
    body: JSON.stringify(payload),
    method: "POST",
    token,
  });
  return toLot(lot);
}

export async function fetchMyOrders(token: string) {
  const orders = await apiRequest<ApiOrder[]>("/api/orders", { token });
  return orders.map(toOrder);
}

export async function createOrder(token: string, payload: CreateOrderPayload) {
  const order = await apiRequest<ApiOrder>("/api/orders", {
    body: JSON.stringify(payload),
    method: "POST",
    token,
  });
  return toOrder(order);
}

export async function fetchMyProfile(token: string) {
  const user = await apiRequest<ApiUser>("/api/account/me", { token });
  return toProfile(user);
}

export async function updateMyProfile(token: string, payload: Omit<AccountProfile, "id" | "phone" | "role" | "status" | "username">) {
  const user = await apiRequest<ApiUser>("/api/account/me", {
    body: JSON.stringify(payload),
    method: "PATCH",
    token,
  });
  return toProfile(user);
}

export async function uploadImage(token: string, uri: string, purpose: "crop-lot-image" | "identity-document") {
  const extension = uri.split(".").pop()?.split("?")[0] || "jpg";
  const mimeType = extension.toLowerCase() === "png" ? "image/png" : "image/jpeg";
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("file", {
    name: `${purpose}.${extension}`,
    type: mimeType,
    uri,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/uploads`, {
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
    });
  } catch {
    throw new Error("File upload failed.");
  }

  if (!response.ok) {
    throw new Error((await readMessage(response)) || "File upload failed.");
  }

  const uploaded = (await response.json()) as UploadedFile;
  return uploaded.url.startsWith("http") ? uploaded.url : `${API_BASE_URL}${uploaded.url}`;
}

export { API_BASE_URL };
