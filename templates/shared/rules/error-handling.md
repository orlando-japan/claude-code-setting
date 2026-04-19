# Error handling

## The one rule

Every error that can affect behavior must be handled — returned, logged, or explicitly discarded with a comment explaining why. Silent discards are latent bugs.

## Wrapping and context

- Wrap errors at each layer boundary with the operation that failed.
- `fmt.Errorf("loading user %d: %w", id, err)` — not just `fmt.Errorf("error: %w", err)`.
- Context goes in the wrapped message. Stack traces go in the log, not the message.

## User-facing vs internal errors

- **User-facing:** short, actionable, no internal detail. "Email is already taken." not "UNIQUE constraint failed: users.email".
- **Internal:** full context, relevant IDs, original error. Log at the handler that decides what to do.
- Never leak database messages, file paths, stack traces, or internal service names to API responses.

## Log once, at the handler

Log the error exactly once — at the point where you stop propagating it and take an action.
- If you return the error, don't log it — the caller will decide.
- If you log it, handle it; don't also return it and let the caller log it again.
- Duplicate logs from the same error are noise. One log, full context.

## When to panic / crash

- **At startup:** missing required config, violated invariant at init time — panic is correct.
- **At runtime:** never panic in request-handling code. Return the error.
- `must*` helpers (e.g. `regexp.MustCompile`) are acceptable for compile-time constants only.

## Language specifics

**Go:** `if err != nil { return fmt.Errorf("op: %w", err) }` at every layer boundary.

**TypeScript/JS:** Typed errors (`class NotFoundError extends Error`). Avoid bare `catch (e) {}`. In async code, always `await` or attach `.catch()` — unhandled promise rejections crash the process.

**Python:** Catch specific exceptions, not bare `except:`. Chain with `raise ... from err`.
