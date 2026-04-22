---
name: system-design
description: Structured approach to designing a non-trivial system. Invoke when scoping a new service, feature, or subsystem before implementation.
category: architecture
group: design
tags: [design, scalability, trade-offs]
risk: medium
---

# System design

The goal is a design you can defend — not the cleverest option, the one that holds up to questioning.

## The 6-step frame

### 1. Clarify requirements

Two lists:

- **Functional:** what must the system do? Enumerate the actual user interactions.
- **Non-functional:** how fast, how reliable, how much data, how many users, how private?

If you don't have numbers, make them up explicitly: "assume 1k RPS, 10M rows, p99 <200ms." Wrong numbers you can iterate on; absent numbers you can't.

### 2. Estimate capacity

Back-of-envelope, not precision:

- Reads / writes per second
- Storage (rows × average size × retention)
- Network egress
- Peak vs steady state

This is where impossible requirements get exposed. "1M writes/sec to a single Postgres instance" stops the conversation before you start coding.

### 3. Data model

- **What entities?** What are their IDs?
- **What relationships?** One-to-many, many-to-many, hierarchical?
- **What access patterns?** Read by ID, scan by timestamp, aggregate by user?
- **Pick storage to fit.** Access patterns drive DB choice, not preference.

### 4. API / interfaces

- Inputs and outputs for each operation.
- Sync vs async (request/response vs queue).
- Pagination, rate limits, idempotency.
- Auth and authz model.

### 5. Architecture sketch

- Components (services, DBs, queues, caches).
- Data flow for the two or three most important operations (draw it).
- Where's the state?
- What's stateless?
- Where are the failure domains?

### 6. Trade-offs and open questions

For each major choice, name the alternative and why you rejected it. Be honest about open questions — "we haven't decided how to handle X" is fine; pretending X is solved is not.

## Non-functional thinking

For each requirement, ask: "what does this mean concretely?"

- **"Highly available"** → 99.9%? 99.99%? What's the downtime budget? What happens during a region outage?
- **"Scales well"** → to what? From what? Vertically? Horizontally? Shardable?
- **"Fast"** → p50 or p99? Measured from where?
- **"Secure"** → against what threat? From whom?

Vague non-functional requirements produce architecture that satisfies nobody.

## Trade-offs are load-bearing

Every architecture makes at least one thing worse. If you can't name what your design is bad at, you don't understand it yet.

- Consistency vs availability (CAP).
- Latency vs throughput.
- Simplicity vs performance.
- Cost vs redundancy.
- Time-to-ship vs long-term maintainability.

State the chosen trade-off out loud. "We chose consistency over availability because financial accuracy is non-negotiable and we can tolerate 1 min of write outage during a failover."

## Anti-patterns

- **Starting with the architecture diagram.** Start with requirements.
- **Using the most complex pattern you know.** Microservices are a cost, not a default.
- **Ignoring failures.** Happy-path designs that don't address "what breaks" are half-designs.
- **"We'll scale later."** Sometimes right, sometimes not. Name when "later" is.
- **Cargo-culting.** "Because $BIG_COMPANY does it" is not a reason. Your scale, team, and problem are different.
