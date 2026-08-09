import type { ApiErrorPayload } from "./contracts";

export class ApiError extends Error {
  readonly code: string;
  readonly field: string | undefined;
  readonly messageBn: string;
  readonly status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.field = payload.field;
    this.messageBn = payload.messageBn;
    this.status = status;
  }
}
