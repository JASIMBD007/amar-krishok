import type { AuthUser, Role } from "../types";

const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:4000"
  : "https://amar-krishok-api.onrender.com";

type ApiRole = "ADMIN" | "BUYER" | "FARMER";

type ApiUser = {
  id: string;
  name: string;
  phone: string;
  role: ApiRole;
};

type LoginResponse = {
  accessToken: string;
  user: ApiUser;
};

const apiRoleToAppRole: Record<ApiRole, Role> = {
  ADMIN: "admin",
  BUYER: "buyer",
  FARMER: "farmer",
};

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRequestError";
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
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      body: JSON.stringify({ name, password, phone, role }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    throw new AuthRequestError("Login service is unavailable. Please try again.");
  }

  if (!response.ok) {
    const message = await readApiMessage(response);
    if (message === "Account is waiting for admin verification.") {
      throw new AuthRequestError(message);
    }

    throw new AuthRequestError("Name, mobile number, or password is incorrect.");
  }

  return toAuthUser((await response.json()) as LoginResponse);
}
