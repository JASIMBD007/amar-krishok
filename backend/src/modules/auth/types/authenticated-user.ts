import { AccountStatus, Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: AccountStatus;
}
