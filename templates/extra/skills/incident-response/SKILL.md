---
name: incident-response
description: Stabilize, diagnose, fix, and learn from a production incident. Invoke when something is on fire, when paged, or when users report a regression.
category: ops
group: ops
tags: [oncall, incident, postmortem]
risk: high
---

# Incident response

Order matters: **stop the bleeding first, diagnose second, fix third, learn fourth.** Skipping steps costs minutes you don't have.

## Phase 1 — Stabilize (minutes 0–15)

Goal: stop the damage growing. You do not need to understand *why* yet.

- **Roll back** if the incident began after a deploy. Rollback beats diagnosis in the first 15 minutes. Always.
- **Disable the broken path.** Feature flag off. Route traffic away. Kill the bad worker.
- **Rate-limit** upstream if the system is drowning.
- **Announce.** Post to the incident channel: what you see, what you're doing, ETA to next update.
- **Appoint a single driver** if more than one person joins. Confusion multiplies.

## Phase 2 — Diagnose (minutes 15–60)

Once stable (even if degraded), find the cause.

- **Check dashboards first.** Which metric turned red, when, and how? That's your start-time and scope.
- **Check logs at the transition.** Not now-logs, transition-logs. What's different at the moment things broke?
- **Correlate with deploys, feature flag changes, config pushes, infra events.** Incidents correlate with change.
- **Test the hypothesis** before claiming you know. "It's the DB" means nothing without evidence.

## Phase 3 — Fix (minutes 60+)

- **Patch, don't rewrite.** Smallest possible fix. "Add a null check" beats "refactor the auth module."
- **Verify the fix locally or in staging** before deploying, *if* you can without escalating the incident.
- **Deploy carefully.** Partial rollout, watch dashboards. Don't fix on deploy auto-pilot.
- **Confirm recovery.** The metric you measured in phase 2 should return to baseline.

## Phase 4 — Learn

After the system is stable. Not the same day necessarily, but within a week.

- **Timeline.** When did each event happen? Use actual timestamps, not "around noon."
- **What went well.** Rollback worked. Alerts fired on time. Someone caught the mistake early.
- **What went badly.** Blind spots. Slow response. Misleading dashboards.
- **Root causes.** 5 Whys. Don't stop at the technical cause ("a null pointer") — go to the process cause ("our tests didn't cover this path because it's only triggered by data we never see in staging").
- **Action items.** Concrete, owned, with a deadline. "Improve monitoring" is not an action item. "Alert on p99 > 500ms for /api/auth by Friday, owner: @Alice" is.

## Rules during an incident

- **Bias toward reversible actions.** Rollback > patch > "just SSH in and fix it."
- **No heroic one-offs** (SSH to prod, edit a file, forget). If you must, document it in the chat immediately so the postmortem captures it.
- **Don't fix two things at once.** Each fix is a variable. Multiple fixes simultaneously = you can't tell which helped.
- **Don't pile on.** If the driver is handling it, offer help but don't issue parallel commands. Too many cooks broke the server.

## Anti-patterns

- **Diagnosing before stabilizing.** Every minute you spend reading logs is a minute more revenue lost.
- **Blaming people in the postmortem.** Focus on systems and processes. People don't write postmortems if they expect to be blamed.
- **"Just monitor it for a bit."** If you don't have a concrete fix and a rollback wasn't enough, the incident isn't over.
- **No postmortem.** Incidents without postmortems recur.
