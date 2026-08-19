import {
  BarChart3,
  MessageSquareText,
  ServerCrash,
  ShoppingBag,
  Sprout,
  Truck,
  UserRoundCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "../../types";

/** One glyph per notification type, so the same kind of news looks the same wherever it is shown. */
export const notificationIcons: Record<NotificationType, LucideIcon> = {
  account: UserRoundCheck,
  chat: MessageSquareText,
  logistics: Truck,
  order: ShoppingBag,
  payout: WalletCards,
  rate: BarChart3,
  supply: Sprout,
  system: ServerCrash,
};
