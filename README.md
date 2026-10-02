# fetch-error-normalizer

Normalize inconsistent REST payloads and transport failures into one small, typed `NormalizedApiError`. The package has no runtime dependencies and does not import or require Axios, React, or a framework.

## What It Does

- Normalizes native `Error` instances, Axios-shaped errors, REST error objects, and unknown thrown values.
- Safely extracts backend messages, codes, details, and validation messages.
- Normalizes Fetch HTTP failures without consuming the original response body.
- Distinguishes HTTP responses, identifiable network failures, timeouts, and cancellations conservatively.

It does not retry requests, log, show notifications, install interceptors, or decide how an application should present an error.

## Requirements

- Node.js 18.17 or newer. Native Fetch is available in Node.js 18.17+ and modern browsers.
- TypeScript consumers should use TypeScript 5 or newer.
- Ships ESM and CommonJS builds with declarations. No runtime dependencies are installed by this package.

## Installation

```sh
npm install fetch-error-normalizer
```

## Quick Start

```ts
import { normalizeError, isNormalizedError } from "fetch-error-normalizer";

try {
	await saveProfile();
} catch (error: unknown) {
	const normalized = normalizeError(error);
	if (isNormalizedError(normalized)) {
		console.error(normalized.status, normalized.message);
	}
}
```

## Fetch

`normalizeFetchResponse` returns `null` for every successful status (including `204`), otherwise a `NormalizedApiError`. It reads a clone of the response; the original body remains readable. Pass a response whose body has not already been consumed for payload extraction. If the body is already used or cloning/reading fails, the HTTP status and fallback message are still returned.

```ts
import { normalizeFetchResponse } from "fetch-error-normalizer";

const response = await fetch("/api/profile");
const apiError = await normalizeFetchResponse(response);
if (apiError) throw apiError;
```

```ts
const apiError = await normalizeFetchResponse(response, {
	fallbackMessage: "The profile could not be saved.",
});
```

JSON is parsed when possible regardless of content type; plain text is retained as a message/details value. Empty or malformed payloads never replace the HTTP error with a JSON parsing exception.

## Axios

Axios is detected structurally, so it remains an optional peer of your application rather than a package dependency.

```ts
import { normalizeError } from "fetch-error-normalizer";

try {
	await axios.post("/api/profile", profile);
} catch (error: unknown) {
	const normalized = normalizeError(error);
	if (normalized.status === 422) {
		const fieldErrors = normalized.fieldErrors;
		// Render fieldErrors in your form.
	}
}
```

## React and Next.js

The library has no React or Next.js integration and works in client or server code. Normalize errors at the boundary where the request is handled:

```tsx
"use client";

import { useState } from "react";
import { normalizeError, normalizeFetchResponse } from "fetch-error-normalizer";

export function SaveButton() {
	const [message, setMessage] = useState<string | null>(null);

	async function save() {
		try {
			const response = await fetch("/api/profile", { method: "POST" });
			const error = await normalizeFetchResponse(response);
			if (error) throw error;
			setMessage(null);
		} catch (caught: unknown) {
			setMessage(normalizeError(caught).message);
		}
	}

	return <button onClick={save}>{message ?? "Save"}</button>;
}
```

In a Next.js route handler or server action, the same functions can be used without client components or framework-specific APIs.

## Normalized Error

```ts
{
	name: "NormalizedApiError",
	message: "Please correct the highlighted fields.",
	status: 422,
	code: "VALIDATION_FAILED",
	source: "fetch",
	fieldErrors: { email: ["Enter a valid email address"] },
	details: { /* original parsed backend payload */ },
	isNetworkError: false,
	isTimeout: false,
	isAborted: false
}
```

`NormalizedApiError` extends `Error`, sets its prototype correctly, retains a stack trace, and supports `instanceof NormalizedApiError`. Its classification fields and field-error mapping are readonly; field-error arrays are frozen. `details` preserves the parsed backend payload (or original thrown input) and is intentionally not schema-transformed.

## Validation Errors

Common formats are supported, including keyed maps and issue arrays:

```ts
import { firstFieldErrorMessages, normalizeError } from "fetch-error-normalizer";

const { fieldErrors } = normalizeError({
	errors: { email: ["Invalid email", "Email is already registered"] },
});

const firstMessageByField = firstFieldErrorMessages({
	issues: [{ path: "email", message: "Invalid email" }],
});
```

`toFieldErrors(error)` returns a fresh `Record<string, string[]>`. `firstFieldErrorMessages(error)` returns the first message per field as a `Record<string, string>`. Supported field names include `field`, `property`, `path`, and `param`; supported messages include `message` and `detail`. Unknown payload shapes safely produce an empty mapping.

## API Reference

### `class NormalizedApiError extends Error`

Constructor: `new NormalizedApiError(message: string, options?: NormalizedApiErrorOptions)`. Options support `status`, `code`, `source`, `fieldErrors`, `details`, and the three boolean classifications. Invalid status values and blank codes become `null`; only valid source values are accepted.

### `normalizeError(error: unknown, options?: NormalizeErrorOptions): NormalizedApiError`

Normalizes an Axios-style error, `Error`, REST payload, or arbitrary thrown value. Options: `fallbackMessage`, used only when the input has no meaningful message. A valid explicit `status` on a REST error object is preserved; status is never guessed from a message.

### `normalizeFetchResponse(response: Response, options?: NormalizeErrorOptions): Promise<NormalizedApiError | null>`

Returns `null` for success, otherwise an HTTP error with the response status and any readable payload details. It reads a cloned response body at most once.

### `isNormalizedError(error: unknown): error is NormalizedErrorShape`

Checks package class identity plus the normalized error's core runtime contract.

### `toFieldErrors(error: unknown): Record<string, string[]>`

Returns a fresh field-to-message-array mapping extracted from a normalized error or a supported raw validation payload.

### `firstFieldErrorMessages(error: unknown): Record<string, string>`

Returns the first validation message for each field.

## Classification

- `fetch`: an HTTP error response processed by `normalizeFetchResponse`.
- `axios`: an Axios-shaped error (including one carrying an HTTP response, timeout, or cancellation).
- `http`: a plain REST-shaped object with a valid explicit HTTP `status`.
- `network`: an Axios-style error with a request but no response.
- `unknown`: other thrown values.

`source` describes which adapter supplied the error; `isNetworkError`, `isTimeout`, and `isAborted` are independent classifications. `status` is `null` when the input carries no valid HTTP status. `code` is `null` unless an input code is supplied. Timeout codes `ECONNABORTED` and `ETIMEDOUT`, cancellation code `ERR_CANCELED`, and `AbortError`/`CanceledError` names are recognized. A timeout or abort is not also marked as a network error. Generic browser Fetch rejections are not classified as network errors because browser errors often cannot distinguish connectivity from CORS, DNS, TLS, or other policy failures.

## Malformed Responses and Security

Malformed JSON falls back to its raw text; unreadable and empty bodies use the HTTP status text or configured fallback. Backend details may contain sensitive data. Avoid logging or displaying `details` without reviewing and sanitizing the payload for your application. Messages from servers are untrusted input and should be rendered as text, not HTML. This library does not redact secrets.

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build:lib
npm run verify:exports
npm run pack:check
```

`npm run build` remains the existing Next.js app build; `npm run build:lib` builds the npm package. The library uses Vitest for deterministic tests and tsup for ESM, CommonJS, declaration, and source-map output.

## Release Checklist

1. Review the API, README, license, and package contents.
2. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build:lib`.
3. Run `npm run verify:exports` and inspect `npm pack --dry-run` output.
4. Update the package version intentionally and review the lockfile diff.
5. Publish only from a clean, reviewed working tree with the intended npm account.

This repository does not publish automatically. Do not run `npm publish` until the checklist and release authorization are complete.

## Contributing

Changes should include focused tests and preserve the dependency-free runtime. Run the development checks above before proposing a change.

## License

MIT. See [LICENSE](./LICENSE).

## Running the Demo

The repository includes a small Next.js demo app. From the repository root:

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To run the demo as a production build, use `npm run build` followed by `npm run start`. The npm library itself is built with `npm run build:lib`.
