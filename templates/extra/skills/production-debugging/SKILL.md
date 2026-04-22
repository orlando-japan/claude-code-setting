---
name: production-debugging
description: Debug a live system without breaking it further. Invoke when something is wrong in prod and you can't just restart it.
category: ops
group: ops
tags: [production, debugging, observability]
risk: high
---

# Production debugging

Rule zero: **don't make the incident worse**. Read-only operations first. Write operations only with deliberate intent.

## The mindset shift

Local debugging: reproduce freely, restart freely, attach a debugger, print everything.

Production debugging: every action is potentially observable to users. You cannot:

- Restart to "try again."
- Add a `print` and redeploy if the build takes 10 minutes.
- Run an experiment that might page other people.
- Attach an interactive debugger that pauses the process.

You must get the answer you need from what's already there, with the minimum perturbation.

## Information sources, in order of safety

### 1. Existing dashboards and metrics (completely safe)

Start here. 80% of "what's wrong" questions are answered by existing metrics.

- Error rate trend: when did it start, how fast is it growing?
- Latency distribution: is p99 blown while p50 is fine? Or both?
- Saturation: CPU, memory, queue depth, connections, thread pool.
- Recent deploys: correlate the start time with deploys.
- Recent config / flag changes: same.

### 2. Logs (safe, with care)

Query the log store for the transition. Not "show me errors from the last hour" (too much) — "show me errors in this service between the exact minute things changed."

- Group by error message: are you seeing one kind of error or many?
- Search for the request ID of a failing user action.
- Look at logs just **before** the errors started: what was the system doing?

Be careful with `tail -f` on prod files — can be slow and noisy. Prefer the log store's query interface.

### 3. Traces (safe, informative)

If you have distributed tracing, a failing request trace shows exactly where time went. Find a failing trace and follow it service to service.

### 4. Database reads (safe if read-only; dangerous if not)

- `SELECT` queries are fine. Be mindful of expensive queries on the primary — prefer a read replica.
- **Never `UPDATE`, `DELETE`, or `INSERT`** as part of debugging. Write operations are mutations; mutations are changes; changes during an incident are risky.
- `EXPLAIN ANALYZE` is usually fine on analytics queries but can cost on transactional ones. Be cautious.

### 5. Live process introspection (handle with care)

- `kubectl exec` into a pod for `top`, `ps`, `lsof`, `netstat`. Read-only.
- Heap dumps, goroutine dumps, thread dumps — take them, don't analyze them in-process.
- `strace` / `perf` / `dtrace` — powerful but can affect the process. Sample briefly.

### 6. Reproduction in staging

If you can reproduce the problem in staging with similar data, debugging is dramatically easier. This is worth setting up even mid-incident if the incident is long-running.

## Actions to avoid

- **Restart to clear state.** If the state is important, you just lost your evidence.
- **"Hot patch" with a file edit on the box.** Config drift is a bigger problem than the bug.
- **SSH into prod and manually run commands** without logging what you did. You'll forget; the postmortem will be wrong.
- **Run a query on the primary** that might lock or scan a huge table.
- **Enable DEBUG logging globally.** Storage cost, log spam, and likely PII leakage.

## The "black box" problem

Sometimes you genuinely can't see inside the process:

- Metrics aren't granular enough.
- Logs weren't emitted for this code path.
- No tracing on this service.

This is not a debug problem; it's an **observability gap**. Options:

1. **Deploy more observability** — add metrics / logs / traces via a focused release, then reproduce.
2. **Reproduce in staging with debug enabled.**
3. **Use eBPF / sampling tools** that don't require code changes (`bcc`, `perf`).

Never accept "we can't see what's happening." If you can't see it, you can't manage it. File a follow-up to add the observability after the incident.

## Rules

- **Read before write.** Always.
- **Log everything you do in the incident channel.** Future-you will thank you during the postmortem.
- **Timestamps matter.** Note when you ran each action. Incidents have narrative.
- **If you take a risky action, announce it first.** "About to run X on the primary, expected to take ~30s, could cause brief slowness."
- **Never multi-task write operations.** One change, verify, next change.

## Anti-patterns

- **"It's fine, it's just a prod debug."** No action on production is routine.
- **Debugging without a hypothesis.** Clicking around dashboards is not debugging. State what you expect to find before looking.
- **Ignoring the dashboards because "I want to see the code."** The dashboards are cheaper. Look there first.
- **Disabling monitoring because it's noisy.** The signal is the one piece of evidence you have. Don't mute it mid-incident.
