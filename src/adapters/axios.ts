import { extractCode, extractMessage, isRecord, meaningfulString } from "../utils/extract-message.js";

export interface AxiosLikeError {
  readonly response?: unknown;
  readonly request?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
  readonly name?: unknown;
  readonly isAxiosError?: unknown;
}

export function isAxiosLike(value: unknown): value is AxiosLikeError {
  if (!isRecord(value)) return false;
  return value.isAxiosError === true ||
    (isRecord(value.response) && typeof value.response.status === "number" && "data" in value.response);
}

export function getAxiosResponse(value: AxiosLikeError): { status: number | null; data: unknown } | null {
  if (!isRecord(value.response)) return null;
  return {
    status: typeof value.response.status === "number" ? value.response.status : null,
    data: value.response.data,
  };
}

export function getAxiosCode(value: AxiosLikeError, data: unknown): string | null {
  return meaningfulString(value.code) ?? extractCode(data);
}

export function getAxiosMessage(value: AxiosLikeError, data: unknown): string | null {
  return extractMessage(data) ?? meaningfulString(value.message);
}

export function classifyAxios(value: AxiosLikeError, code: string | null): {
  isTimeout: boolean;
  isAborted: boolean;
  isNetworkError: boolean;
} {
  const isTimeout = code === "ECONNABORTED" || code === "ETIMEDOUT";
  const isAborted = code === "ERR_CANCELED" || value.name === "CanceledError" || value.name === "AbortError";
  return {
    isTimeout,
    isAborted,
    isNetworkError: !isTimeout && !isAborted && value.response == null && value.request != null,
  };
}