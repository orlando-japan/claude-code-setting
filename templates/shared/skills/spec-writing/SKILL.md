---
name: spec-writing
description: Write a spec that a different engineer could implement without asking questions. Invoke when starting a new feature, especially one that will be handed off or implemented later.
category: workflow
tags: [spec, requirements, openspec]
risk: low
---

# Spec writing

The test of a good spec: a different engineer reads it and implements the right thing without having to ask follow-up questions. If they would ask, the spec is incomplete.

## Sections

A spec has four parts. They serve different purposes; don't mix them.

### 1. Problem statement (2–5 sentences)

Not the solution — the problem. Who is hitting it? What are they trying to do? Why is the current state insufficient? If this is fuzzy, the rest of the spec is built on sand.

### 2. Scope

**In scope:** bullet list of behaviors the change will produce. Concrete and observable.

**Out of scope (non-goals):** bullet list of things someone might reasonably expect to be included but aren't. Most spec disputes come from scope ambiguity — non-goals are load-bearing.

### 3. Requirements as scenarios

Not "the system shall X." Scenarios in Given / When / Then form:

```
Scenario: logged-out user hitting a protected route
  Given a user with no active session
  When they visit /settings
  Then they are redirected to /login?return_to=/settings
  And the return_to parameter URL-encodes the original path
```

Each scenario is testable. Each covers exactly one behavior. Edge cases get their own scenarios.

### 4. Design (if non-trivial)

If the implementation isn't obvious, add a design section:

- One-paragraph technical approach.
- Data model changes, if any (schema diff).
- New APIs, if any (shape, not implementation).
- At least **one rejected alternative** with the reason.
- Dependencies: what this assumes about existing code.

If the rejected alternative is a strawman ("we could do nothing, but that's bad"), you haven't thought hard enough.

## Rules

- **No code.** Specs describe behavior; code goes in the implementation. Exception: interface shapes (API schema, type definitions).
- **No "obviously."** If it's obvious, state it — the implementer might not agree.
- **No "we should probably."** Decide or ask. Specs are decisions.
- **Surface unknowns.** A section labeled "Open questions" with "we need to decide X before we can ship Y" is *more* trustworthy than a spec that pretends to have all answers.
- **Link prior art.** If another spec or feature is related, link it. Don't re-derive.

## When to refine vs when to ship

Specs are iterative. Don't pre-optimize. Ship a v0.1 spec covering the happy path, get review, then expand. Overwrought specs die in review.

## Anti-patterns

- **Spec as implementation guide.** "Add a `sessionMiddleware` to `routes.ts` on line 42" — that's implementation, not spec.
- **Spec as wishlist.** "It should be fast, reliable, and secure" — not testable, not useful.
- **Spec as PRD.** Product context is fine in the problem statement; don't let marketing copy crowd out scenarios.
- **Skipping the rejected alternatives.** They're the most valuable section for future maintainers.
