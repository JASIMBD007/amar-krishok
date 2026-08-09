import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { PlatformRole, PlatformUserStatus } from "@prisma/client";
import { equal, throws } from "node:assert/strict";
import { test } from "node:test";

import { PlatformRolesGuard } from "./platform-auth";

function context(role: PlatformRole): ExecutionContext {
  return {
    getClass: () => class CarrierController {},
    getHandler: () => function trips() {},
    getType: () => "http",
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => ({ platformUser: { id: "test-user", name: "Test", phone: "+8801711000000", role, status: PlatformUserStatus.ACTIVE } }),
      getResponse: () => undefined,
    }),
    switchToRpc: () => ({ getContext: () => undefined, getData: () => undefined }),
    switchToWs: () => ({ getClient: () => undefined, getData: () => undefined, getPattern: () => undefined }),
  } as unknown as ExecutionContext;
}

const reflector = { getAllAndOverride: () => [PlatformRole.CARRIER] } as unknown as Reflector;

test("a farmer token receives 403 from carrier-scoped endpoints", () => {
  const guard = new PlatformRolesGuard(reflector);
  throws(() => guard.canActivate(context(PlatformRole.FARMER)), ForbiddenException);
});

test("a carrier token can pass carrier-scoped endpoints", () => {
  const guard = new PlatformRolesGuard(reflector);
  equal(guard.canActivate(context(PlatformRole.CARRIER)), true);
});
