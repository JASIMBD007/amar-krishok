import { Role } from "@prisma/client";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from "class-validator";

export class RegisterAccountDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, {
    message: "Username can use 3-32 letters, numbers, dots, underscores, or hyphens.",
  })
  username!: string;

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

  @ValidateIf((dto: LoginDto) => dto.role === Role.ADMIN)
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, {
    message: "Username can use 3-32 letters, numbers, dots, underscores, or hyphens.",
  })
  username?: string;

  @ValidateIf((dto: LoginDto) => dto.role !== Role.ADMIN)
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
