import { isRecord, meaningfulString } from "./extract-message.js";

type FieldErrors = Record<string, string[]>;

function append(target: FieldErrors, field: string, message: string): void {
  const normalizedField = field.trim();
  if (!normalizedField) return;
  (target[normalizedField] ??= []).push(message);
}

function readFieldMap(value: unknown, target: FieldErrors): void {
  if (!isRecord(value)) return;
  for (const [field, rawMessages] of Object.entries(value)) {
    if (Array.isArray(rawMessages)) {
      for (const rawMessage of rawMessages) {
        const message = meaningfulString(rawMessage);
        if (message) append(target, field, message);
      }
    } else {
      const message = meaningfulString(rawMessages);
      if (message) append(target, field, message);
    }
  }
}

function readIssue(issue: unknown, target: FieldErrors): void {
  if (!isRecord(issue)) return;
  const field = meaningfulString(issue.field) ??
    meaningfulString(issue.property) ??
    meaningfulString(issue.path) ??
    meaningfulString(issue.param);
  const message = meaningfulString(issue.message) ?? meaningfulString(issue.detail);
  if (field && message) append(target, field, message);
}

export function extractFieldErrors(value: unknown): FieldErrors {
  const result: FieldErrors = Object.create(null) as FieldErrors;
  if (Array.isArray(value)) {
    for (const issue of value) readIssue(issue, result);
  } else if (isRecord(value)) {
    readFieldMap(value.errors, result);
    readFieldMap(value.fieldErrors, result);
    if (Array.isArray(value.issues)) {
      for (const issue of value.issues) readIssue(issue, result);
    }
    if (Array.isArray(value.errors)) {
      for (const issue of value.errors) readIssue(issue, result);
    }
    if (isRecord(value.error) || Array.isArray(value.error)) {
      merge(result, extractFieldErrors(value.error));
    }
    if (isRecord(value.data)) merge(result, extractFieldErrors(value.data));
  }
  return result;
}

function merge(target: FieldErrors, source: FieldErrors): void {
  for (const [field, messages] of Object.entries(source)) {
    for (const message of messages) append(target, field, message);
  }
}