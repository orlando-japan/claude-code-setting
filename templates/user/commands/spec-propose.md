---
description: Start a new feature spec using OpenSpec, layered with company conventions
argument-hint: [short feature description]
---

You are starting a new spec-driven change for: **$ARGUMENTS**

Follow the OpenSpec propose workflow to produce:

1. A **proposal** (`proposal.md`) — rationale, scope, non-goals
2. A **specification** (`spec.md`) — requirements with concrete scenarios
3. A **design doc** (`design.md`) — technical approach, alternatives considered, rejected options and why
4. A **task checklist** (`tasks.md`) — ordered, each task small enough to verify independently

**Company conventions on top of OpenSpec:**

- Place the change folder under `openspec/changes/<yyyy-mm-dd>-<slug>/`
- Each task in `tasks.md` must include a **verification** line: the exact command or check that proves it's done
- The design doc must list at least **one rejected alternative** with the reason for rejection — if you can't think of one, the problem isn't clear enough
- Cross-link any related existing specs in `openspec/specs/`

Before writing anything, ask any clarifying questions the feature description doesn't answer. Don't guess.

After producing the artifacts, show the user a summary and wait for approval before running `/spec:apply`.
