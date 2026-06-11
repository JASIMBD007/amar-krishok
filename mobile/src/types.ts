export type Role = "admin" | "buyer" | "farmer";
export type Language = "en" | "bn";
export type AccountStatus = "active" | "pending" | "rejected";

export type AuthUser = {
  accessToken: string;
  id: string;
  name: string;
  phone: string;
  role: Role;
  username: string;
};

export type District = {
  id?: string;
  name: string;
  active?: boolean;
};

export type AccountProfile = {
  address: string;
  district: string;
  focus: string;
  id: string;
  identity: string;
  name: string;
  organization: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  upazilla: string;
  username: string;
};

export type CropLot = {
  crop: string;
  createdAt: string;
  district: string;
  farmer: string;
  grade: string;
  harvestDate?: string | null;
  id: string;
  imageUrl?: string | null;
  notes?: string | null;
  phone?: string;
  pricePerKg: number;
  quantityKg: number;
  status: string;
  upazilla?: string | null;
};

export type OrderItem = {
  crop: string;
  cropLotId?: string | null;
  offeredPricePerKg: number;
  quantityKg: number;
};

export type Order = {
  createdAt: string;
  deliveryAddress: string;
  district: string;
  id: string;
  items: OrderItem[];
  notes?: string | null;
  status: string;
  targetDate?: string | null;
  totalValue: number;
  upazilla?: string | null;
};

export type RegisterPayload = {
  address: string;
  district: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  role: Exclude<Role, "admin">;
  upazilla: string;
};

export type CreateLotPayload = {
  crop: string;
  district: string;
  grade: string;
  harvestDate?: string;
  imageUrl?: string;
  notes?: string;
  pricePerKg: number;
  quantityKg: number;
  upazilla: string;
};

export type CreateOrderPayload = {
  deliveryAddress: string;
  district: string;
  items: OrderItem[];
  notes?: string;
  targetDate?: string;
  upazilla: string;
};

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};
