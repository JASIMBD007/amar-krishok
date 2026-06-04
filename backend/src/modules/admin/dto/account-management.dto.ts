import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class AdminCreateAccountDto {
  @IsIn(["buyer", "farmer"])
  role!: "buyer" | "farmer";

  @IsIn(["pending", "active", "rejected"])
  @IsOptional()
  status?: "pending" | "active" | "rejected";

  @IsString()
  @IsNotEmpty()
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
}

export class AdminUpdateAccountDto {
  @IsIn(["pending", "active", "rejected"])
  @IsOptional()
  status?: "pending" | "active" | "rejected";

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9._-]{3,32}$/, {
    message: "Username can use 3-32 letters, numbers, dots, underscores, or hyphens.",
  })
  username?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(4)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  upazilla?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  identity?: string;

  @IsString()
  @IsOptional()
  focus?: string;
}
