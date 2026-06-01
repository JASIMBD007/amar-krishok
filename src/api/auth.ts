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
  role: ApiRole;
  status?: ApiAccountStatus;
  organization?: string | null;
  address?: string | null;
  identity?: string | null;
  focus?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  district?: {
    name: string;
  } | null;
};

type LoginResponse = {
  accessToken: string;
  user: ApiUser;
};

type ApiLotFarmer = Omit<ApiUser, "phone"> & {
  phone?: string;
};

export type BackendCropLot = {
  id: string;
  crop: { name: string };
  district: { name: string };
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
  grade: string;
  harvestDate?: string;
  imageUrl?: string;
  notes?: string;
  pricePerKg: number;
  quantityKg: number;
};

type RegisterAccountPayload = {
  address: string;
  district: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  role: RegistrationRole;
};

const apiRoleToAppRole: Record<ApiRole, Role> = {
  ADMIN: "admin",
  BUYER: "buyer",
  FARMER: "farmer",
};

const apiStatusToAccountStatus: Record<ApiAccountStatus, AccountStatus> = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
};

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
  };
}

export function toRegisteredAccount(user: ApiUser): RegisteredAccount {
  return {
    address: user.address ?? "",
    district: user.district?.name ?? "",
    focus: user.focus ?? "",
    id: user.id,
    identity: user.identity ?? "",
    name: user.name,
    organization: user.organization ?? "",
    password: "",
    phone: user.phone,
    reviewedAt: user.reviewedAt ?? undefined,
    role: apiRoleToAppRole[user.role] as RegistrationRole,
    status: user.status ? apiStatusToAccountStatus[user.status] : "pending",
    submittedAt: user.createdAt ?? new Date().toISOString(),
  };
}

export async function loginWithApi({
  name,
  password,
  phone,
  role,
}: {
  name: string;
  password: string;
  phone: string;
  role: Role;
}) {
  try {
    return toAuthUser(await apiRequest<LoginResponse>("/api/auth/login", {
      body: JSON.stringify({ name, password, phone, role }),
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
      throw new AuthRequestError("Name, mobile number, or password is incorrect.");
    }

    throw new AuthRequestError(message || "Login service is unavailable. Please try again.");
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

export async function fetchPendingVerifications(accessToken: string) {
  const users = await apiRequest<ApiUser[]>("/api/admin/verifications", { accessToken });
  return users.map(toRegisteredAccount).filter((account) => account.role === "buyer" || account.role === "farmer");
}

export async function updateBackendVerification(accessToken: string, id: string, status: AccountStatus) {
  const action = status === "active" ? "approve" : "reject";
  const user = await apiRequest<ApiUser>(`/api/admin/verifications/${id}/${action}`, {
    accessToken,
    method: "PATCH",
  });
  return toRegisteredAccount(user);
}
