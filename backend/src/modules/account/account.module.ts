import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

@Module({
  controllers: [AccountController],
  imports: [PrismaModule],
  providers: [AccountService],
})
export class AccountModule {}
