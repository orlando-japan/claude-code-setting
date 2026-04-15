---
name: adr-writing
description: Write Architecture Decision Records future engineers will actually read. Invoke when making a non-trivial architectural choice that you want to defend later.
category: architecture
tags: [adr, decisions, documentation]
risk: low
---

# ADR writing

An ADR captures **a decision, the reason, and the alternatives rejected** — so that in six months, the "why the hell did we do it this way" question has a one-page answer.

ADRs are not design docs. A design doc is 10+ pages describing *how*. An ADR is one page describing *what we decided and why*.

## When to write one

- You chose between two or more real options.
- The choice has lasting consequences (hard to reverse).
- The reasoning includes constraints a future reader wouldn't infer from the code.
- Anyone asked "why don't we do it the other way?"

Not every decision warrants an ADR. "We named the variable `x`" does not. "We chose Postgres over DynamoDB for the orders service" does.

## Template

```markdown
# ADR-0042: Use Postgres for the orders service

Date: 2026-04-14
Status: Accepted
Deciders: @alice, @bob
Related: ADR-0039 (orders service scope)

## Context

<2-3 paragraphs. What's the problem? What constraints apply?
What are we trying to optimize for? What are the non-goals?>

## Decision

<1 paragraph. Just the decision, no reasoning yet. "We will use
Postgres as the primary database for the orders service.">

## Reasoning

<Why this choice fits the constraints. 3-5 bullets or short
paragraphs. Be concrete — "ACID transactions across orders and
inventory" beats "reliability".>

## Alternatives considered

### Option A: DynamoDB
- Pros: ...
- Cons: ...
- Rejected because: ...

### Option B: MySQL
- Pros: ...
- Cons: ...
- Rejected because: ...

## Consequences

<Both positive and negative. What do we gain? What do we give up?
What will be harder because of this decision?>

## Revisit conditions

<When should someone come back and question this? E.g.,
"If order volume exceeds 10k/sec" or "If we need cross-region
writes".>
```

## Sections that earn their keep

### Context

Without context, the decision is inexplicable in 6 months. Include:

- The problem being solved (not the solution).
- The constraints (team, budget, deadline, existing systems).
- The non-goals (what this decision is explicitly *not* trying to address).

### Alternatives considered

**This is the most important section.** A decision without alternatives looks arbitrary. With alternatives, the reader understands the trade-space.

- **At least two.** One alternative is a strawman. Two means you considered.
- **Steelman each.** Give the rejected options their best case. "DynamoDB is bad" is not analysis; "DynamoDB gave us X but cost us Y" is.
- **Explicit rejection reason.** Don't just list pros/cons. Say *why* the cons outweighed.

### Consequences

Include both positive and *negative*. Every decision has trade-offs. Naming the trade-offs is how you defend the decision later.

### Revisit conditions

When does this decision need to be reconsidered? "Never" is almost always wrong. Write the trigger — scale, team size, new requirement — that should prompt a revisit.

## Lifecycle

- **Proposed** → under discussion, not yet adopted.
- **Accepted** → decided, active.
- **Deprecated** → no longer followed, but kept for history. Link to the replacement ADR.
- **Superseded by ADR-XXXX** → a later ADR replaces this one. Link both directions.

**Never delete ADRs.** Even superseded ones are valuable. They show the decision's evolution.

## Rules

- **Number them.** ADR-0001, ADR-0002. Easy to reference.
- **Immutable once accepted.** If you change your mind, write a new ADR that supersedes the old one.
- **One decision per ADR.** Don't bundle.
- **Short.** One page. If it's longer, split or it's really a design doc.
- **Link from code.** A comment `// see ADR-0042` beats a wiki link nobody opens.

## Anti-patterns

- **ADR as PR description.** The ADR is about the decision, not the implementation.
- **ADR written after the fact.** Retroactive ADRs are better than no ADR, but real-time is best.
- **"We should probably use X"** — vague. Write the decision as a decision.
- **Strawman alternatives.** Steelman, always.
- **No context.** Future readers won't have it.
- **No negative consequences.** Every decision has them. Name them.
