---
name: runbook-authoring
description: Write runbooks that a sleepy oncall engineer at 3am can actually follow. Invoke when shipping anything pageable, or when a runbook is stale after a postmortem.
category: ops
group: ops
tags: [runbook, oncall, operational]
risk: medium
---

# Runbook authoring

A runbook is **for tired people under pressure**. Everything in it must be executable without context, without thinking, without making judgment calls the author forgot to remove.

Golden rule: **the reader is you, at 3am, with a hangover, paged for the first time.**

## What a runbook is NOT

- A design doc.
- A description of how the system works.
- A narrative explaining the history of an incident.
- A document only the author can follow.

It's a **checklist with copy-pasteable commands**.

## Template

Every runbook has the same sections:

### 1. When this page fires

The alert name that triggers this runbook, the condition, and the threshold. "You got paged because X is true."

### 2. What's broken

One sentence. Non-abstract. "The auth service can't reach Redis and is failing logins."

### 3. Immediate stabilization

The first thing to do before diagnosing. Rollback, kill switch, rate limit, failover. **Commands that can be copy-pasted.**

```
# Roll back the auth service
kubectl rollout undo deployment/auth -n prod
```

Not "roll back the deployment." The literal command.

### 4. Verify stabilization

How do you know the bleeding stopped? A specific metric, a specific query, a specific page to check.

```
# Error rate should drop below 1% in ~2 min
curl -s https://metrics.internal/api/v1/query?query='rate(auth_errors[1m])'
```

### 5. Diagnose

Now that things are stable (even if degraded), here's how to find what's really wrong. Dashboards to open (with links), logs to search (with exact queries), common causes to check.

This section is longer and can be a decision tree: "if X, then Y."

### 6. Fix

Once diagnosed, common fixes with exact commands.

### 7. Escalation

Who to wake up if you can't resolve it in N minutes. Names, rotations, contact methods.

### 8. After the page

- Where to file the incident report.
- Postmortem expectation.
- Links to related runbooks.

## Rules

- **Copy-pasteable commands.** No `<your-service>` placeholders. If the command needs a variable, provide a dropdown or a query to find it.
- **Dashboard and log links with the query pre-filled.** Not "look at the dashboard." The literal URL with the time window.
- **One decision at a time.** No "this could mean several things, consider…" — walk the reader through the decision tree.
- **Commands come with expected output.** So the reader knows when it worked.
- **Test it.** Walk a teammate through it. If they ask questions, add the answers to the runbook.

## Maintenance

Runbooks rot faster than code. A stale runbook is worse than no runbook — it misleads.

- **Every incident triggers a runbook update.** If the runbook wasn't followed, find out why. Edit it.
- **Every architectural change triggers a runbook review.** Did the commands still work? Did the dashboards move?
- **Quarterly runbook drill.** Pick a random runbook. Have someone unfamiliar execute the first three sections against staging. Note anything that breaks.
- **Retire old runbooks.** If a system is gone, its runbook should be gone.

## Anti-patterns

- **"Follow the standard procedure."** Nobody knows the standard procedure at 3am.
- **"Check the logs for errors."** Which logs? Which errors? Which query?
- **Essay-style prose.** Sleepy people don't read essays. Bullets and commands.
- **Runbook written by the person who built the thing.** They know too much. Have someone unfamiliar edit it.
- **Runbook with no "immediate stabilization" section.** The first thing a pager-on engineer needs is to stop the bleeding. Don't bury that under architecture.
- **Runbook referencing deprecated tools.** Update when the tools change. Schedule the review.
