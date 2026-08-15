import { IsBoolean, IsIn, IsString, MinLength } from "class-validator";

export class UpdatePaymentDetailsDto {
  @IsIn(["BKASH", "NAGAD", "BANK"])
  method!: "BKASH" | "NAGAD" | "BANK";

  @IsString()
  @MinLength(5)
  account!: string;
}

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  smsOrderUpdates!: boolean;

  @IsBoolean()
  smsRateAlerts!: boolean;

  @IsBoolean()
  appNotifications!: boolean;

  @IsBoolean()
  weeklySummary!: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(4)
  currentPassword!: string;

  @IsString()
  @MinLength(4)
  newPassword!: string;
}
