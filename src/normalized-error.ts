import type {
  NormalizedApiErrorOptions,
  NormalizedErrorShape,
  NormalizedErrorSource,
} from "./types.js";
import { isRecord } from "./utils/extract-message.js";

const VALID_SOURCES: readonly NormalizedErrorSource[] = [
  "fetch",
  "axios",
  "http",
  "network",
  "unknown",
];

function freezeFieldErrors(
  fieldErrors: Readonly<Record<string, readonly string[]>> | undefined,
): Readonly<Record<string, readonly string[]>> {
  const frozen: Record<string, readonly string[]> = Object.create(null) as Record<
    string,
    readonly string[]
  >;

  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (Array.isArray(messages)) {
        frozen[field] = Object.freeze(messages.filter((message): message is string => typeof message === "string"));
      }
    }
  }

  return Object.freeze(frozen);
}

/**
 * Error class carrying a stable, immutable summary of an API or request failure.
 */
export class NormalizedApiError extends Error implements NormalizedErrorShape {
  public override readonly name = "NormalizedApiError" as const;
  public readonly status: number | null;
  public readonly code: string | null;
  public readonly source: NormalizedErrorSource;
  public readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  public readonly details: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;
  public readonly isAborted: boolean;

  /** Create a normalized error with a message and optional classification metadata. */
  public constructor(message: string, options: NormalizedApiErrorOptions = {}) {
    super(typeof message === "string" && message.trim() ? message : "Request failed.");

    const safeOptions = (isRecord(options) ? options : {}) as NormalizedApiErrorOptions;

    this.status = isHttpStatus(safeOptions.status) ? safeOptions.status : null;
    this.code = typeof safeOptions.code === "string" && safeOptions.code.trim() ? safeOptions.code : null;
    this.source = VALID_SOURCES.includes(safeOptions.source ?? "unknown")
      ? safeOptions.source ?? "unknown"
      : "unknown";
    this.fieldErrors = freezeFieldErrors(safeOptions.fieldErrors);
    this.details = safeOptions.details;
    this.isTimeout = safeOptions.isTimeout === true;
    this.isAborted = safeOptions.isAborted === true;
    this.isNetworkError = safeOptions.isNetworkError === true && !this.isTimeout && !this.isAborted;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isHttpStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}