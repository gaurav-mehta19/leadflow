import { z } from "zod";

import { COPY } from "@/config/copy";

const KNOWN_KEYS = new Set([
  "type",
  "title",
  "status",
  "detail",
  "instance",
  "request_id",
  "errors",
]);

const problemSchema = z
  .object({
    type: z.string().optional(),
    title: z.string().optional(),
    status: z.number().int().optional(),
    detail: z.string().optional(),
    request_id: z.string().nullable().optional(),
    errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
  })
  .loose();

export type FieldErrors = Record<string, string>;

type ApiErrorInit = {
  status: number;
  title: string;
  detail: string;
  type?: string;
  fieldErrors?: FieldErrors;
  requestId?: string | null;
  extensions?: Record<string, unknown>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly type: string;
  readonly fieldErrors: FieldErrors;
  readonly requestId: string | null;
  readonly extensions: Record<string, unknown>;

  constructor(init: ApiErrorInit) {
    super(init.detail);
    this.name = "ApiError";
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.type = init.type ?? "about:blank";
    this.fieldErrors = init.fieldErrors ?? {};
    this.requestId = init.requestId ?? null;
    this.extensions = init.extensions ?? {};
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

  get isRetryable(): boolean {
    return this.isNetworkError || this.status >= 500;
  }

  extensionString(key: string): string | null {
    const value = this.extensions[key];
    return typeof value === "string" ? value : null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function parseProblem(body: unknown, status: number, requestId: string | null): ApiError {
  const parsed = problemSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError({
      status,
      title: COPY.errors.genericTitle,
      detail: COPY.errors.genericDetail,
      requestId,
    });
  }
  const problem = parsed.data;
  const fieldErrors: FieldErrors = {};
  for (const error of problem.errors ?? []) {
    fieldErrors[error.field] ??= error.message;
  }
  const extensions = Object.fromEntries(
    Object.entries(problem).filter(([key]) => !KNOWN_KEYS.has(key)),
  );
  return new ApiError({
    status: problem.status ?? status,
    title: problem.title ?? COPY.errors.genericTitle,
    detail: problem.detail ?? COPY.errors.genericDetail,
    type: problem.type,
    fieldErrors,
    requestId: problem.request_id ?? requestId,
    extensions,
  });
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const requestId = response.headers.get("X-Request-ID");
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return parseProblem(body, response.status, requestId);
}

export function networkError(): ApiError {
  return new ApiError({
    status: 0,
    title: COPY.errors.networkTitle,
    detail: COPY.errors.networkDetail,
  });
}

export function errorSummary(error: unknown): {
  title: string;
  detail: string;
  requestId: string | null;
} {
  if (isApiError(error)) {
    return { title: error.title, detail: error.detail, requestId: error.requestId };
  }
  return { title: COPY.errors.genericTitle, detail: COPY.errors.genericDetail, requestId: null };
}
