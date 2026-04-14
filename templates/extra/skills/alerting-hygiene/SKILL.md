---
name: alerting-hygiene
description: Keep the pager actionable. Invoke when setting up a new alert, auditing existing alerts, or after being woken up by a noisy alert.
category: ops
tags: [alerting, pagerduty, oncall, sre]
risk: medium
---

# Alerting hygiene

A good alert:

1. **Fires on real user impact**, not internal quirks.
2. **Is actionable** — the oncall engineer can do something about it.
3. **Has a runbook.**
4. **Fires rarely enough to stay trusted.**

Fail any of those four and you're degrading the team's trust in the pager.

## The test

For every alert, answer:

- **User impact:** what does the customer experience when this fires?
- **Action:** what does the oncall engineer do in the next 5 minutes?
- **Runbook:** where is the playbook?
- **False positive rate:** how often has this fired and been a no-op?

If any answer is "nothing" or "I don't know," the alert needs work.

## What to alert on

### Symptoms, not causes

- **Good:** "Error rate on /api/checkout exceeds 1% for 5 minutes."
- **Bad:** "Redis CPU at 80%."

Symptom alerts fire when customers are hurt. Cause alerts might be fine or might be a slow burn to a real problem; you can't tell from the alert alone.

### SLO-based

If you have SLOs, burn rate alerts are the gold standard:

- **Fast burn:** you'll exceed the monthly budget in 1 hour at this rate → page.
- **Slow burn:** you'll exceed the monthly budget in 30 days at this rate → ticket.

Burn rate alerts handle both the acute incident and the slow drift without needing separate thresholds.

### Availability and latency at the right quantile

- Alert on p95 or p99, not mean. Mean hides tail latency.
- Alert on absolute numbers, not relative ("more than yesterday"). Yesterday might have been broken too.

## What not to alert on

- **Resource metrics in isolation.** "Disk 80% full" is a ticket; "disk is about to fill and cause outage in 10 minutes" is a page.
- **Tests failing on a scheduled job.** That's a CI issue, not a page.
- **Individual errors.** "One request failed" is noise. "Error rate crossed threshold" is signal.
- **Things where the engineer can't act.** "3rd party API is down" — if you can't fix it, why wake someone up? Inform the team via a different channel.

## Severity

- **Critical / page-now:** customer impact right now, action required in minutes. Sleeping engineers get woken up.
- **High / ticket-urgent:** real issue, but can wait until morning. Goes to a ticketing channel or on-call's queue.
- **Info:** not an alert, it's a status update. Goes to a dashboard or a stats channel.

**Escalation path:** if critical isn't acknowledged within N minutes, escalate to the next person. Don't let pages sit.

## Alert hygiene rules

- **Every alert has a runbook.** No runbook, no alert. Block new alerts without one.
- **Every alert has an owner.** Someone is responsible for its reliability. If the owner leaves, reassign immediately.
- **Every alert has a dashboard link.** Click the alert, land on the dashboard.
- **Every alert has a rollback option named.** What's the safest action if you're not sure?
- **Alerts deactivate themselves** when the condition clears. No manual "ack and forget."
- **Track false positive rate.** Aim for < 10% false positives. Higher = fix or retire the alert.

## When to retire an alert

- It's fired 20 times with no action taken.
- It duplicates another alert that's more actionable.
- The underlying cause has been fixed and the alert no longer applies.
- It's noisy — if you fix it, it becomes silent for long enough that it goes stale.

**Don't just mute noisy alerts.** Retire them or fix them. Mutes drift and cause real incidents to be missed.

## After an incident

- Did the right alert fire? If yes, good — adjust threshold/runbook if needed.
- Did no alert fire and you found out another way? Add one now.
- Did the wrong alert fire? Fix the alert; don't make the engineer filter signal from noise.
- Did many alerts fire for one cause? Deduplicate at the alert layer or at the pager.

## Anti-patterns

- **"Just one more alert, just in case."** Alerts compound; pagers become unreadable.
- **Alerting on averages.** Hides tail latency problems.
- **Flat thresholds on normal-distributed metrics.** A 500ms threshold looks fine until p99 normally sits at 600ms.
- **Alerting without context.** "Threshold exceeded" with no explanation. Include what, where, current value, and what to do.
- **Alert → email-that-nobody-reads.** Alerts either wake someone up or they're not real alerts.
- **Nightly alert storm nobody responds to.** The alerts have trained people to ignore them. That's the worst state.
