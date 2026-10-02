import { NormalizedApiError } from "./normalized-error.js";
import { extractCode, extractFieldErrors, extractMessage, meaningfulString } from "./utils/index.js";
import type { NormalizeErrorOptions } from "./types.js";

const DEFAULT_FALLBACK = "Request failed.";

/** Normalize a Fetch Response, returning null for successful status codes. */
export async function normalizeFetchResponse(
  response: Response,
  options: NormalizeErrorOptions = {},
): Promise<NormalizedApiError | null> {
  const configuredFallback = meaningfulString(
    options && typeof options === "object" ? (options as NormalizeErrorOptions).fallbackMessage : null,
  );
  if (!response || typeof response.ok !== "boolean") {
    return new NormalizedApiError(configuredFallback ?? DEFAULT_FALLBACK, {
      source: "unknown",
      details: response,
    });
  }
  if (response.ok) return null;

  let payload: unknown;
  try {
    if (!response.bodyUsed && typeof response.clone === "function") {
      const clone = response.clone();
      const text = await clone.text();
      if (text.trim()) {
        try {
          payload = JSON.parse(text) as unknown;
        } catch {
          payload = text;
        }
      }
    }
  } catch {
    payload = undefined;
  }

  const fallback = configuredFallback ??
    meaningfulString(response.statusText) ?? DEFAULT_FALLBACK;
  const message = extractMessage(payload) ?? meaningfulString(payload) ?? fallback;
  return new NormalizedApiError(message, {
    status: response.status,
    code: extractCode(payload),
    source: "fetch",
    fieldErrors: extractFieldErrors(payload),
    details: payload,
  });
}