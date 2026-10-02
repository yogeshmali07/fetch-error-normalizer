import { classifyAxios, getAxiosCode, getAxiosMessage, getAxiosResponse, isAxiosLike } from "./adapters/axios.js";
import { NormalizedApiError } from "./normalized-error.js";
import { extractCode, extractFieldErrors, extractMessage, isRecord, meaningfulString } from "./utils/index.js";
import type { NormalizeErrorOptions } from "./types.js";

const DEFAULT_FALLBACK = "Request failed.";

/** Normalize Axios-style errors, Error instances, and arbitrary thrown values. */
export function normalizeError(error: unknown, options: NormalizeErrorOptions = {}): NormalizedApiError {
  const fallback = (isRecord(options) ? meaningfulString(options.fallbackMessage) : null) ?? DEFAULT_FALLBACK;

  if (isAxiosLike(error)) {
    const response = getAxiosResponse(error);
    const data = response?.data;
    const code = getAxiosCode(error, data);
    const classification = classifyAxios(error, code);
    const status = isValidStatus(response?.status) ? response.status : null;
    const message = getAxiosMessage(error, data) ?? fallback;
    return new NormalizedApiError(message, {
      status,
      code,
      source: status !== null ? "axios" : classification.isNetworkError ? "network" : "axios",
      fieldErrors: extractFieldErrors(data),
      details: data ?? (response ? undefined : error),
      ...classification,
    });
  }

  const record = isRecord(error) ? error : null;
  const name = record ? meaningfulString(record.name) : null;
  const code = extractCode(error);
  const status = record && isValidStatus(record.status) ? record.status : null;
  const isTimeout = code === "ETIMEDOUT" || code === "ECONNABORTED";
  const isAborted = name === "AbortError" || code === "ABORT_ERR";
  const message = error instanceof Error
    ? meaningfulString(error.message) ?? fallback
    : extractMessage(error) ?? meaningfulString(error) ?? fallback;

  return new NormalizedApiError(message, {
    status,
    code,
    source: status !== null ? "http" : isTimeout || isAborted ? "network" : "unknown",
    fieldErrors: extractFieldErrors(error),
    details: error,
    isTimeout,
    isAborted,
  });
}

function isValidStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}