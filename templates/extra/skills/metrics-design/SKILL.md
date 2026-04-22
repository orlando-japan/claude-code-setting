---
name: metrics-design
description: Pick metrics that drive alerts and debugging without drowning in dashboards. Invoke when instrumenting a new service or auditing existing metrics.
category: observability
group: ops
tags: [metrics, monitoring, sre, red, use]
risk: medium
---

# Metrics design

Metrics should answer two questions: **"is it working?"** and **"if not, what's wrong?"** Most teams emit 100 metrics and can't answer either.

## Start with a framework

### RED — for request-driven services

For every service endpoint / request type:

- **Rate** — requests per second.
- **Errors** — fraction of requests that failed.
- **Duration** — latency distribution (p50, p95, p99).

Three numbers. Covers 80% of "is the API working?"

### USE — for resources

For every resource (CPU, disk, memory, thread pool, connection pool):

- **Utilization** — fraction of time busy.
- **Saturation** — queue depth / waiting work.
- **Errors** — errors encountered.

Answers "is something maxing out?"

### The four golden signals (Google SRE)

- **Latency** — how long does a request take (success vs error separately).
- **Traffic** — how many requests.
- **Errors** — how many fail.
- **Saturation** — how full the system is.

Pick one framework per service and stick with it. Mixing creates dashboard chaos.

## What a single metric needs

- **A name** — dot-separated or slash-separated, stable, meaningful. `api.request.duration_ms`, not `timer_47`.
- **A unit** — put it in the name (`_ms`, `_bytes`, `_count`). Avoids "is this seconds or milliseconds?" confusion.
- **Labels / tags** — for slicing. `status`, `method`, `route`, `service`. **Be careful:** each combination is a separate time series.
- **A type** — counter (monotonic), gauge (snapshot), histogram (distribution). Don't use a gauge where you need percentiles.

## Label cardinality

This is the biggest metrics mistake. Each unique combination of label values creates a time series. Some labels are fine; some explode your storage.

- **Fine:** `status` (small enum), `method` (small), `route` (bounded list of endpoints).
- **Dangerous:** `user_id`, `request_id`, `ip`, `session_id`, full URL with query strings.

Rule of thumb: a label's cardinality should be bounded by a small constant (≤~100) or by the cluster topology (not by user count).

## Histograms over averages

- Averages lie. The average latency can be 50ms while p99 is 3s.
- Use histograms. Read p50, p95, p99, p99.9 from them.
- Set bucket boundaries to match your SLO. If you care about "under 200ms," make sure 200ms is a bucket edge.

## Alerting rules

- **Alert on symptoms, not causes.** "API error rate > 1%" > "database CPU > 80%." Users don't care why; they care that it broke.
- **Alert on user-visible signals.** Page for things that affect customers. Log for internal curiosity.
- **Burn rate alerts.** Error budgets get eaten fast in outages; alert when the rate of consumption is bad, not just when the absolute level is bad.
- **Few alerts that matter.** Pagers that fire 20 times a day get muted.

## What NOT to instrument

- **Every function.** Instrument boundaries (service-to-service, to DB, to cache), not internals.
- **Business metrics at monitoring granularity.** "Revenue per hour" belongs in analytics, not Prometheus. Different retention, different access patterns.
- **"Just in case" metrics.** Each metric costs storage and cognitive load. Metric you don't read = metric you should delete.
- **Success as a counter.** Track `request_total` with a `status` label, not `request_success` and `request_failure` separately.

## Anti-patterns

- **Counter of success and error as separate metrics.** Hard to compute rates. Use one counter with a label.
- **Timestamp-in-value hacks.** Store timestamps as a gauge or a separate dimension, not as a number you'll have to reason about.
- **Long-tail label values.** One user_id per label value = one time series per user = ruin.
- **Averaging averages.** If you must reduce, average the counts, not the averages.
- **No units in the metric name.** Guaranteed confusion six months later.
