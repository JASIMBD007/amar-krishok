import { Role } from "@prisma/client";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class RegisterAccountDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, {
    message: "Username can use 3-32 letters, numbers, dots, underscores, or hyphens.",
  })
  username?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsString()
  @IsNotEmpty()
  organization!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsNotEmpty()
  upazilla!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  identity!: string;

  @IsString()
  @IsNotEmpty()
  focus!: string;

  @IsOptional()
  @IsString()
  buyerType?: string;

  @IsOptional()
  @IsString()
  farmSize?: string;
}

export class LoginDto {
  @IsIn([Role.ADMIN, Role.BUYER, Role.FARMER])
  role!: Role;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, {
    message: "Username can use 3-32 letters, numbers, dots, underscores, or hyphens.",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

export class PasswordResetLookupDto {
  @IsIn([Role.BUYER, Role.FARMER])
  role!: typeof Role.BUYER | typeof Role.FARMER;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class PasswordResetConfirmDto extends PasswordResetLookupDto {
  @IsString()
  @MinLength(4)
  password!: string;
}
