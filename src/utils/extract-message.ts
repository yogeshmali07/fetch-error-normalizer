const MESSAGE_KEYS = ["message", "detail", "title", "error"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function meaningfulString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function extractMessage(value: unknown): string | null {
  if (typeof value === "string") return meaningfulString(value);
  if (!isRecord(value)) return null;

  for (const key of MESSAGE_KEYS) {
    const candidate = meaningfulString(value[key]);
    if (candidate) return candidate;
  }

  if (isRecord(value.error)) return extractMessage(value.error);
  if (isRecord(value.data)) return extractMessage(value.data);
  return null;
}

export function extractCode(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return meaningfulString(value.code) ??
    (isRecord(value.error) ? extractCode(value.error) : null) ??
    (isRecord(value.data) ? extractCode(value.data) : null);
}