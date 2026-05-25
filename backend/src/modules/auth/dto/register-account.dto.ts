import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterAccountDto {
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
  @IsIn(["admin", "buyer", "farmer"])
  role!: "admin" | "buyer" | "farmer";

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
