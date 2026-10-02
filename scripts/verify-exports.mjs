import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const esm = await import("../dist/index.js");
const commonjs = require("../dist/index.cjs");

for (const api of [esm, commonjs]) {
  assert.equal(typeof api.normalizeError, "function");
  assert.equal(typeof api.normalizeFetchResponse, "function");
  assert.equal(typeof api.NormalizedApiError, "function");
  assert.equal(api.normalizeError("smoke").message, "smoke");
}

console.log("ESM and CommonJS package entry points load successfully.");