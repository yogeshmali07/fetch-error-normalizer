import { NormalizedApiError } from "./normalized-error.js";
import { extractFieldErrors } from "./utils/extract-field-errors.js";
import type { NormalizedErrorShape } from "./types.js";

/** Type guard for errors produced by this package. */
export function isNormalizedError(error: unknown): error is NormalizedErrorShape {
  if (!(error instanceof NormalizedApiError)) return false;
  return error.name === "NormalizedApiError" &&
    (error.status === null || (Number.isInteger(error.status) && error.status >= 100 && error.status <= 599)) &&
    typeof error.message === "string" &&
    typeof error.isNetworkError === "boolean" &&
    typeof error.isTimeout === "boolean" &&
    typeof error.isAborted === "boolean";
}

/** Return validation messages as mutable string arrays keyed by field. */
export function toFieldErrors(error: unknown): Record<string, string[]> {
  return error instanceof NormalizedApiError
    ? Object.fromEntries(Object.entries(error.fieldErrors).map(([field, messages]) => [field, [...messages]]))
    : extractFieldErrors(error);
}

/** Return the first validation message for each field. */
export function firstFieldErrorMessages(error: unknown): Record<string, string> {
  const fieldErrors = toFieldErrors(error);
  const first: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages[0]) first[field] = messages[0];
  }
  return first;
}