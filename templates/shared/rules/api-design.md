# API design

## HTTP semantics

- **GET** — idempotent and safe, no side effects.
- **POST** — creates or triggers an action. Not idempotent unless the client sends an idempotency key.
- **PUT** — replaces the full resource. Must be idempotent.
- **PATCH** — updates specific fields. Document which fields are patchable.
- **DELETE** — removes the resource. Must be idempotent: deleting an already-deleted resource returns 200 or 204, not 404.

## Status codes

| Code | Use for |
|---|---|
| 400 | Client sent invalid input |
| 401 | Not authenticated |
| 403 | Authenticated but not permitted |
| 404 | Resource not found (or caller shouldn't know it exists) |
| 409 | State conflict — e.g. duplicate creation |
| 422 | Input is syntactically valid but semantically wrong |
| 429 | Rate limited |
| 5xx | Server fault — never return 5xx for client input errors |

## Error response format

Always return a consistent JSON error body:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "email is required",
    "fields": { "email": "required" }
  }
}
```

`code` is machine-readable. `message` is human-readable. `fields` is optional, for input validation.

## Versioning and backwards compatibility

- Use a `/v1/` path prefix. Increment only on breaking changes.
- **Non-breaking:** adding new optional fields, adding new endpoints.
- **Breaking:** removing fields, renaming fields, changing types, changing semantics. Deprecate before removing.
- Never silently change behavior in an existing versioned endpoint.

## Inputs and pagination

- Validate all inputs at the HTTP boundary. Return 400 with field-level detail, not a generic error.
- Strip unknown fields rather than silently ignoring them — unknown fields usually indicate a client bug.
- Paginate collections. Default page size ≤ 100. Prefer cursor-based pagination over offset for large tables.

## Layering

HTTP handlers do three things: parse request → call service → serialize response. Business logic belongs in the service layer, not in handlers. A handler that does business logic is a handler that can't be tested without HTTP.
