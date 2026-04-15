---
name: api-design-principles
description: Design consistent, evolvable APIs. Invoke when adding or changing an HTTP, gRPC, or SDK interface that external or internal callers depend on.
category: architecture
tags: [api, design, rest]
risk: medium
---

# API design principles

APIs are contracts. Contracts are expensive to change. Design them once, carefully.

## The core principles

### Consistency beats cleverness

If every other endpoint is `POST /resource`, don't invent `PUT /resource/create` because it feels more REST-ful. Future callers learn one pattern; every deviation costs them.

### Make the easy path the correct path

If the right behavior requires a flag, users won't find it. Defaults must be correct. Dangerous behaviors must be opt-in and verbose.

### Names tell the whole story

- `GET /users/:id` — obvious.
- `POST /users/:id/orders` — obvious.
- `POST /users/:id/block` — obvious.
- `POST /do-thing` — never.
- `POST /api/v2/users/:id?action=block` — no, make it an endpoint.

Verbs in paths are fine when REST's resource model doesn't fit. Don't contort.

### Errors are part of the API

- **Structured.** `{ "error": { "code": "not_found", "message": "User 42 does not exist" } }`.
- **Stable codes.** Callers will branch on `code`. Don't rename it.
- **No stack traces** in production responses.
- **HTTP status matches semantics.** 400 ≠ 404 ≠ 422. Don't return 200 with an error body.

### Idempotency

Mutations that might be retried (creates especially) should accept an idempotency key and dedupe server-side. Otherwise, retries create duplicates and you'll find out on an incident.

### Pagination

- **Every list endpoint gets pagination from day one.** Adding it later breaks callers.
- **Cursor-based beats offset-based** for large datasets (stable under writes).
- **Max page size enforced server-side.** `?limit=1000000` must be clamped or rejected.

### Versioning

- **Major version in the URL** (`/v1/`, `/v2/`) for external APIs. Clean, visible, routable.
- **No implicit breaking changes.** Adding a field to responses = safe. Removing or renaming = breaking → new version.
- **Deprecation has a date.** "Deprecated in v1" with no sunset date stays forever.

### Backwards compatibility

For public APIs, assume someone will call you wrong. Be liberal in what you accept, strict in what you return.

- Unknown query params → ignore, don't 400.
- Missing optional fields → use documented default, don't 400.
- Extra JSON fields in request → ignore, don't 400.

## Concrete checklist

Before shipping an endpoint:

- [ ] Path and method match the resource model
- [ ] Auth required at the endpoint level (not assumed)
- [ ] Input validation with specific error codes
- [ ] Idempotency for mutating operations
- [ ] Pagination for list endpoints
- [ ] Stable error code vocabulary
- [ ] Rate limit / cost bounded
- [ ] Logging with request ID + user (redacted)
- [ ] OpenAPI / proto / whatever schema updated
- [ ] Example usage in the docs

## Anti-patterns

- **The "just one more field" boolean.** `isAdmin`, `isActive`, `isBanned`, `isVerified`… merge into a state enum before it's 12 flags.
- **RPC over REST.** `POST /api/doThing` is fine; `POST /api/thing/doAction` is not worse than contorting into REST.
- **Mixed casing.** Pick `snake_case` or `camelCase` and never deviate.
- **"Private" APIs that leak.** If it's accessible, someone will use it. Assume everything is public.
