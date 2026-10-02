/** The origin category assigned to a normalized error. */
export type NormalizedErrorSource = "fetch" | "axios" | "http" | "network" | "unknown";

/** Immutable metadata accepted by {@link NormalizedApiError}. */
export interface NormalizedApiErrorOptions {
  readonly status?: number | null;
  readonly code?: string | null;
  readonly source?: NormalizedErrorSource;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly details?: unknown;
  readonly isNetworkError?: boolean;
  readonly isTimeout?: boolean;
  readonly isAborted?: boolean;
}

/** Options shared by error normalization helpers. */
export interface NormalizeErrorOptions {
  /** Used only when the input does not contain a meaningful message. */
  readonly fallbackMessage?: string;
}

/** Stable, transport-independent shape for API and request failures. */
export interface NormalizedErrorShape extends Error {
  readonly name: "NormalizedApiError";
  readonly message: string;
  readonly status: number | null;
  readonly code: string | null;
  readonly source: NormalizedErrorSource;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly details: unknown;
  readonly isNetworkError: boolean;
  readonly isTimeout: boolean;
  readonly isAborted: boolean;
}