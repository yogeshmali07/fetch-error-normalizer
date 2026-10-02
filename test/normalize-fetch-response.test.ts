import { describe, expect, it } from "vitest";
import { normalizeFetchResponse } from "../src/index.js";

describe("normalizeFetchResponse", () => {
  it("normalizes JSON HTTP errors without consuming the original response", async () => {
    const response = new Response(JSON.stringify({ title: "Invalid input", errors: { email: ["Invalid", "Used"] } }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
    const result = await normalizeFetchResponse(response);
    expect(result).toMatchObject({ source: "fetch", status: 422, message: "Invalid input" });
    expect(result?.fieldErrors.email).toEqual(["Invalid", "Used"]);
    expect(response.bodyUsed).toBe(false);
    expect(await response.json()).toEqual({ title: "Invalid input", errors: { email: ["Invalid", "Used"] } });
  });

  it("handles plain text and malformed JSON safely", async () => {
    const plainText = await normalizeFetchResponse(new Response("Upstream unavailable", { status: 503 }));
    const malformed = await normalizeFetchResponse(new Response("{not json", {
      status: 500,
      headers: { "content-type": "application/json" },
    }));
    expect(plainText?.message).toBe("Upstream unavailable");
    expect(malformed?.message).toBe("{not json");
    expect(malformed?.status).toBe(500);
  });

  it("handles empty bodies and status text fallback", async () => {
    const result = await normalizeFetchResponse(new Response(null, { status: 500, statusText: "Server exploded" }));
    expect(result?.message).toBe("Server exploded");
    expect(result?.details).toBeUndefined();
  });

  it("uses configured fallback when status text and payload message are missing", async () => {
    const result = await normalizeFetchResponse(new Response(null, { status: 500, statusText: "" }), {
      fallbackMessage: "API failed",
    });
    expect(result?.message).toBe("API failed");
  });

  it("safely handles null options at runtime", async () => {
    const result = await normalizeFetchResponse(new Response(null, { status: 500 }), null as never);
    expect(result?.message).toBe("Request failed.");
  });

  it("returns null for successful and bodyless responses", async () => {
    expect(await normalizeFetchResponse(new Response("ok", { status: 200 }))).toBeNull();
    expect(await normalizeFetchResponse(new Response(null, { status: 204 }))).toBeNull();
  });

  it("does not replace HTTP status handling when the body was already consumed", async () => {
    const response = new Response("hidden body", { status: 400 });
    await response.text();
    const result = await normalizeFetchResponse(response);
    expect(result).toMatchObject({ status: 400, source: "fetch" });
  });
});