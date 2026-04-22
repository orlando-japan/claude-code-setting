---
name: tracing-setup
description: Add distributed tracing to a service so you can follow a request across service boundaries. Invoke when debugging cross-service latency or setting up observability from scratch.
category: observability
group: ops
tags: [tracing, opentelemetry, jaeger, distributed]
risk: medium
---

# Tracing setup

Metrics answer "is it slow?" Logs answer "what happened at this point?" Traces answer "where did my request spend its time?" — across services, async boundaries, and databases.

## The model

A **trace** is a tree of **spans**. A span represents a unit of work: a request, a DB query, an external call. Each span has:

- A name ("http POST /orders")
- Start and end timestamps
- A parent span (or root)
- Key-value attributes (user_id, status code, query shape)
- Events and errors attached

The trace ID propagates across service boundaries (usually via a header: `traceparent` in W3C trace context).

## Minimum viable tracing

1. **Pick a backend.** Jaeger, Tempo, Honeycomb, Datadog, Lightstep. All support OpenTelemetry.
2. **Use OpenTelemetry.** Vendor lock-in on tracing protocols is expensive to unwind. OTel is the standard.
3. **Auto-instrument what you can.** Most HTTP servers, DB drivers, and HTTP clients have OTel auto-instrumentation that creates spans for free.
4. **Propagate trace context across service boundaries.** The HTTP client and server both need to handle the `traceparent` header.
5. **Sample.** 100% sampling is too expensive in production. 1–10% head-based or tail-based sampling is typical.

## What to span

- **Incoming requests** (auto).
- **Outgoing HTTP calls** (auto).
- **DB queries** (auto, via instrumented driver).
- **Async work** — jobs, background tasks (usually manual).
- **Expensive computation** (manual) — anything you want to see the duration of.

**Don't** span every function call. Traces get unreadable, storage gets expensive.

## Span attributes

Attach context so you can filter traces later:

- `user_id` (with PII rules — hash or omit if sensitive)
- `request_id`
- `route` (the matched route, not the literal URL with IDs)
- `db.statement` (parameterized, not the raw query with values)
- `error.kind` on failed spans

Cardinality rules: same as metrics labels. Avoid per-request-unique values in attributes you'll want to aggregate.

## Sampling strategies

- **Head-based:** decide at the entry point. Cheap, simple, predictable. Miss rare errors if the sample rate is low.
- **Tail-based:** wait for the trace to complete, then decide based on outcome (always keep errors, sample successes). More expensive, better signal.
- **Dynamic:** sample more during incidents, less during normal operation.

For production: start with head-based at 1–5%, with 100% on errors. Upgrade to tail-based if you need rare-error visibility.

## When to add spans manually

- A code block you need to time.
- A branch point you need to identify (cache hit vs miss, fallback triggered).
- Async handoffs (message queues, workers).
- Cross-process work that the auto-instrumentation doesn't capture.

## Anti-patterns

- **Tracing everything.** Cost and noise. Trace at boundaries.
- **Not propagating across services.** Traces break at every hop. Worthless.
- **Attributes with high cardinality.** Breaks the backend's indexing.
- **Raw SQL in `db.statement`.** Parameterize or obfuscate — it may contain user data.
- **No sampling.** 100% of production traffic is storage apocalypse.
- **Ignoring trace context in async queues.** A job triggered by a request should link back to that request's trace. Inject the trace context into the message.
