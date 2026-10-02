import { describe, expect, it } from "vitest";
import {
  firstFieldErrorMessages,
  isNormalizedError,
  normalizeError,
  NormalizedApiError,
  toFieldErrors,
} from "../src/index.js";

describe("normalizeError", () => {
  it("normalizes Error instances without mutating them and keeps Error behavior", () => {
    const original = new TypeError("broken");
    const stack = original.stack;
    const result = normalizeError(original);
    expect(result).toBeInstanceOf(Error);
    expect(result).toBeInstanceOf(NormalizedApiError);
    expect(result.name).toBe("NormalizedApiError");
    expect(result.message).toBe("broken");
    expect(result.stack).toContain("NormalizedApiError: broken");
    expect(original.name).toBe("TypeError");
    expect(original.stack).toBe(stack);
    expect(result.status).toBeNull();
    expect(result.isNetworkError).toBe(false);
  });

  it.each([
    ["a thrown string", "a thrown string"],
    [{ message: "object message" }, "object message"],
    [null, "Request failed."],
    [undefined, "Request failed."],
    [42, "42"],
  ])("handles unknown input %#", (input, message) => {
    expect(normalizeError(input).message).toBe(message);
  });

  it("uses the configured fallback only when no message is present", () => {
    expect(normalizeError(null, { fallbackMessage: "Try again" }).message).toBe("Try again");
    expect(normalizeError({ message: "Backend" }, { fallbackMessage: "Try again" }).message).toBe("Backend");
  });

  it("safely handles null options at runtime", () => {
    expect(normalizeError(null, null as never).message).toBe("Request failed.");
    expect(new NormalizedApiError("safe", null as never).message).toBe("safe");
  });

  it("preserves only an explicitly supplied valid HTTP status on REST objects", () => {
    expect(normalizeError({ status: 409, error: "Conflict" })).toMatchObject({
      status: 409,
      source: "http",
      message: "Conflict",
    });
    expect(normalizeError({ status: 700, message: "Unknown status" }).status).toBeNull();
  });

  it("normalizes Axios response data and preserves validation details", () => {
    const result = normalizeError({
      isAxiosError: true,
      message: "Request failed with status code 422",
      response: {
        status: 422,
        data: { message: "Please correct the form", code: "VALIDATION", errors: { email: ["Invalid", "Already used"] } },
      },
    });
    expect(result.source).toBe("axios");
    expect(result.status).toBe(422);
    expect(result.code).toBe("VALIDATION");
    expect(result.message).toBe("Please correct the form");
    expect(result.fieldErrors.email).toEqual(["Invalid", "Already used"]);
    expect(result.details).toEqual({ message: "Please correct the form", code: "VALIDATION", errors: { email: ["Invalid", "Already used"] } });
  });

  it("classifies Axios no-response network, timeout, and cancellation errors", () => {
    const network = normalizeError({ isAxiosError: true, request: {}, message: "Network Error" });
    const timeout = normalizeError({ isAxiosError: true, code: "ECONNABORTED", message: "timeout" });
    const aborted = normalizeError({ isAxiosError: true, code: "ERR_CANCELED", name: "CanceledError" });
    expect(network).toMatchObject({ source: "network", status: null, isNetworkError: true, isTimeout: false, isAborted: false });
    expect(timeout).toMatchObject({ source: "axios", isNetworkError: false, isTimeout: true, isAborted: false });
    expect(aborted).toMatchObject({ isNetworkError: false, isTimeout: false, isAborted: true });
  });

  it("does not infer a network failure from every Axios error", () => {
    expect(normalizeError({ isAxiosError: true, message: "setup failed" }).isNetworkError).toBe(false);
  });

  it("extracts common validation issue arrays and nested errors", () => {
    const result = normalizeError({ errors: [{ field: "name", message: "Required" }, { path: "name", message: "Too short" }] });
    expect(result.fieldErrors.name).toEqual(["Required", "Too short"]);
    expect(toFieldErrors(result)).toEqual({ name: ["Required", "Too short"] });
    expect(firstFieldErrorMessages(result).name).toBe("Required");
  });

  it("returns an empty mapping for errors without field validation", () => {
    expect(toFieldErrors(new Error("no fields"))).toEqual({});
    expect(firstFieldErrorMessages(new Error("no fields"))).toEqual({});
  });

  it("recognizes only package NormalizedApiError instances", () => {
    expect(isNormalizedError(normalizeError("x"))).toBe(true);
    expect(isNormalizedError(new Error("x"))).toBe(false);
    expect(isNormalizedError({ name: "NormalizedApiError", status: 500 })).toBe(false);
  });

  it("keeps field errors and their arrays immutable", () => {
    const result = new NormalizedApiError("x", { fieldErrors: { email: ["bad"] } });
    expect(Object.isFrozen(result.fieldErrors)).toBe(true);
    expect(Object.isFrozen(result.fieldErrors.email)).toBe(true);
  });
});