# Observability

## Logging — what to log

- Service boundary crossings: every inbound request, every outbound call to a dependency.
- Errors with full context: message, operation name, relevant IDs (user, request, resource).
- State transitions that matter for debugging: job started/finished, payment processed, deploy triggered.

## Logging — what NOT to log

- **Secrets, tokens, passwords, session IDs** — not in any log level, ever.
- **PII** (email, name, phone, address, IP) — unless legally required and explicitly masked.
- High-frequency normal operations ("heartbeat received", "cache hit") — they bury signal in noise.

## Log format

- **Structured (JSON) in production.** Key-value pairs, not free-form strings.
- Every log line must carry: `service`, `level`, `timestamp` (ISO-8601 UTC), `trace_id`.
- `message` describes the event, not the code path. "payment declined" not "entered processPayment at line 42".

## Trace IDs

- Generate a trace ID at the entry point (API gateway or job runner). Propagate downstream via header (`X-Trace-Id` or `traceparent` for W3C trace context).
- Log the trace ID on every line in the request's scope. It turns scattered log lines into a reconstructable timeline.
- Include the trace ID in error responses returned to clients — it lets anyone with log access find the full story.

## Metrics

- Instrument every external call: call count, error count, latency histogram (p50/p95/p99).
- Metric naming: `<service>_<noun>_<unit>` — e.g. `payments_charge_duration_ms`.
- Separate success and failure counters. Don't compute error rate from a single total counter.
- Health endpoint: `GET /health` returns `200` only when the service is ready to serve traffic.

## Alerting

- Alert on **symptoms** (user-visible error rate, latency p99), not on **causes** (CPU %, memory).
- Every alert must link to a runbook or include inline remediation steps.
- If an alert fires and nobody acts on it for two weeks, it is either wrong (fix it) or noise (delete it).
