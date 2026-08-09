export type ApiMeta = Record<string, unknown>;

export type ApiEnvelope<TData, TMeta extends ApiMeta = ApiMeta> = {
  data: TData;
  meta?: TMeta;
};

export type ApiErrorPayload = {
  code: string;
  field?: string;
  message: string;
  messageBn: string;
};

export type ApiErrorEnvelope = {
  error: ApiErrorPayload;
};

export type RefreshData = {
  accessToken: string;
  refreshToken?: string;
};

export type ApiRequestOptions<TBody = unknown> = Omit<
  RequestInit,
  "body" | "headers" | "method"
> & {
  auth?: boolean;
  body?: TBody;
  headers?: HeadersInit;
  idempotencyKey?: string;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
};
