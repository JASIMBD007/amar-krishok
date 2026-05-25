import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export type ApiChatRole = "admin" | "buyer" | "farmer" | "guest";

export class CreateChatThreadDto {
  @IsString()
  @IsOptional()
  participantId?: string;

  @IsIn(["buyer", "farmer", "guest"])
  participantRole!: Exclude<ApiChatRole, "admin">;

  @IsString()
  @IsNotEmpty()
  participantName!: string;

  @IsString()
  @IsNotEmpty()
  participantPhone!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class CreateChatMessageDto {
  @IsString()
  @IsOptional()
  senderId?: string;

  @IsIn(["admin", "buyer", "farmer", "guest"])
  senderRole!: ApiChatRole;

  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}
