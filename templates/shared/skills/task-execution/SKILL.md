---
name: task-execution
description: Work through an approved task list without drifting off-scope. Invoke during /spec:apply or any structured implementation where tasks are pre-defined.
category: workflow
tags: [tasks, discipline, execution]
risk: low
---

# Task execution

You have a task list. Your job is to execute it faithfully — not to expand it, not to improve it, not to second-guess the spec while implementing.

## Protocol

1. **Read the next task fully** before writing code. Understand the verification before the implementation.
2. **Verify understanding** — if anything in the task is ambiguous, stop and ask *before* coding. Asking after implementation wastes work.
3. **Implement just that task.** Not the next one, not related cleanup, not "while I'm here" improvements.
4. **Run the task's verification.** It must pass for this task to be done.
5. **Mark the task done** in `tasks.md` — edit the file, don't just say it in chat.
6. **Commit.** One task group per commit, referencing the task IDs or spec slug.
7. **Next task.**

## Golden rules

### Don't expand scope

If task 3 says "add a redirect for logged-out users hitting /settings," the task is that redirect. Not redirects for all protected routes. Not a refactor of the middleware. Not better error messages. Just the redirect.

### Don't re-plan

The spec was approved. Re-litigating design decisions during implementation wastes time and destabilizes the work. If you spot a real problem with the design, **stop and surface it** — don't silently change course.

### Don't silently fix the spec

If a task reveals the spec is wrong — a requirement that can't be met, a scenario that's self-contradictory, a design that breaks an existing feature — **stop**. Report the discrepancy. Let the user decide whether to update the spec or adjust the implementation. Don't patch it invisibly.

### Don't batch verification

Run each task's verification *immediately* after implementing it. If you batch and verify at the end, you can't tell which change broke what.

### Don't skip tasks

Tasks are ordered for a reason. Skipping ahead risks building on foundations that aren't in place yet. If a task is genuinely impossible to do now, surface it.

## When to stop

- A task's verification fails and you can't diagnose it in ~30 min → stop, ask the user or the original spec author.
- A task reveals a spec contradiction → stop, surface, wait for decision.
- The task takes longer than estimated by >2x → stop, re-estimate, let the user decide whether to continue.
- You're about to touch a file the spec didn't anticipate → stop, ask.

## After all tasks

- Run the **full** test suite, not just focused ones. Regressions lurk in unrelated areas.
- Verify every scenario in `spec.md` has corresponding test coverage. If one is missing, add the test.
- Do **not** run `/spec:archive` yourself — that's the user's call after review.
- Write a short summary: what tasks completed, what tests passed, any deviations from the spec, any open follow-ups.

## Anti-patterns

- **"I noticed this unrelated thing while I was in there."** Keep a list for later; don't silently change it now.
- **Marking a task done without running its verification.** This is how specs and reality diverge.
- **Adding "bonus" tests.** Fine in principle; but they belong in their own commit, and they shouldn't delay the task.
- **Re-reading the spec defensively between every task.** Re-read when you're confused. Don't burn time re-reading for comfort.
