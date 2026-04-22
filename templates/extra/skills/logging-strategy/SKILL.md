---
name: logging-strategy
description: Log what you'd want during an incident, nothing more. Invoke when adding logging to new code or auditing existing logs for noise.
category: observability
group: ops
tags: [logging, observability, debugging]
risk: medium
---

# Logging strategy

Logs are for two audiences: **debugging a specific problem** (you, tomorrow) and **triggering alerts** (a machine). Everything else is noise and cost.

## The levels

Pick your levels deliberately — most teams over-use `INFO`.

- **DEBUG** — for a developer actively debugging; off in production.
- **INFO** — one line per request / job / transaction at most. Something a human might want to find later.
- **WARN** — something unusual that didn't fail but might. "Degraded to fallback cache." Actionable.
- **ERROR** — the operation failed. Someone should know. Includes enough context to reproduce.
- **FATAL / CRITICAL** — the process is about to exit or the system is unsound. Pages someone.

## Structured, always

Never log free-text when you could log structured fields. `user_id=42 event=login status=ok latency_ms=87` is searchable and aggregatable. `"User 42 logged in successfully in 87ms"` is not.

Use the platform's structured logger: `zap`, `pino`, `structlog`, `slog`. Emit JSON.

## Every log line should have

- **Request ID** (correlates across services)
- **User ID** (with privacy rules — see below)
- **Event name** (machine-readable)
- **Timestamp** (the framework adds this)
- **Level**
- **Service / component**

Beyond that, fields that matter for *this specific event*.

## Never log

- **Passwords, tokens, API keys, session cookies.** Redact at the boundary, not "promise to remember."
- **PII unless the event requires it.** "User logged in" doesn't need their email.
- **Full request bodies.** Log the shape, not the payload.
- **Full response bodies.** Same.
- **Stack traces to end users.** They get a request ID; the log has the trace.
- **Successful happy paths at INFO.** "Cache hit" does not belong in a log.

## What to log

**At INFO (one per logical unit of work):**

- Request received + request completed (with status and latency)
- Job started + job completed
- State transition of a domain object ("order → paid")

**At WARN:**

- Fallback taken ("primary cache unavailable, using local")
- Retry happened
- Slow query (above threshold)
- Deprecated code path hit

**At ERROR:**

- Uncaught exception
- Failed external call with all retries exhausted
- Domain invariant violated
- Any condition that should page someone or go in an alert

**At DEBUG (local / conditional):**

- Loop internals
- Variable dumps
- SQL queries with bound parameters

## Cost awareness

Logs are not free. In high-traffic systems:

- Sampling: log 1% of INFO, 100% of ERROR.
- Rate limiting: "same error N times in a minute → log once with count."
- Field pruning: do you need the full header map, or just `content-type`?

A team that emits 1TB of logs a day is drowning. Nobody reads them. Cut.

## Log formatting rules

- **One event, one line.** Never split an event across lines.
- **Events, not sentences.** `user.login.success` not "user logged in successfully."
- **ISO timestamps.** Never "2 min ago" — the log reader might be in a different timezone or reading it next week.
- **Error objects with stack.** Don't convert to string and lose the trace.

## Anti-patterns

- **`print()` or `console.log()`** left in production code.
- **"Logger spam" at DEBUG** as a substitute for a debugger. Use the debugger.
- **No request ID.** Debugging across services is impossible.
- **Logging to files on local disk without rotation.** Disks fill, systems crash.
- **Secrets in logs, but "only in dev."** Dev logs get shipped, shared, or breached. Redact always.
- **Different log shapes per service.** Dashboards can't unify across inconsistent formats.
