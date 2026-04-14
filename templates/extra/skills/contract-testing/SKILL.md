---
name: contract-testing
description: Verify service-to-service contracts so that a provider change can't silently break a consumer. Invoke when designing tests for microservice boundaries.
category: testing
tags: [contract, microservices, pact]
risk: medium
---

# Contract testing

Integration tests between services are slow, flaky, and hard to run. Contract tests are the alternative: each side asserts the shape of the interface independently, and a CI check fails when they disagree.

## The pattern

1. **Consumer** writes a contract: "when I call `GET /users/:id`, I expect a JSON object with `id: string`, `email: string`, and `created_at: ISO8601`."
2. **Consumer tests run against a mock** that enforces the contract. No real network.
3. **Provider** pulls the contract and runs a verification test: "can my real `GET /users/:id` satisfy that contract?"
4. **If either side changes in an incompatible way, the verification fails** before the change merges.

Tools: **Pact** is the dominant framework; **Spring Cloud Contract**, **Postman contract tests**, and **OpenAPI** + schema validation are alternatives.

## When contract tests help

- Multiple services under independent teams with independent deploys.
- APIs that are stable contracts, not constantly evolving shapes.
- Cross-team coordination is expensive.

## When they don't

- Monolith with shared types (the type system is your contract).
- Prototype / exploratory service where the API is in flux.
- Single consumer and single provider owned by the same team.

## Rules

- **Consumer drives the contract.** The consumer says what it needs; the provider proves it can supply. Not the other way around.
- **Only test your consumer's usage.** If your consumer only uses 3 fields of a 20-field response, the contract has 3 fields. Don't over-spec.
- **Contracts are not docs.** Don't try to make the contract describe the whole API. That's OpenAPI's job.
- **Version contracts with consumers.** When consumer v2 needs a new field, the contract changes. The old consumer v1 contract still exists until v1 is retired.
- **Provider verification runs on provider's CI.** Consumer contract tests run on consumer's CI. Contracts are a shared artifact in the middle.

## Failure modes

- **Flaky because real service involved.** Contract tests should not hit a real service. Consumer uses mocks, provider runs in isolation.
- **Contracts drift from reality.** The consumer updated the contract but never pushed it to the shared store. Automate.
- **Over-spec.** Contract tests assert things the consumer doesn't actually care about. Every extra assertion is a false positive waiting to happen.

## Anti-patterns

- **Using contract tests to replace integration tests.** They serve different purposes. Contract tests verify shape; integration tests verify behavior.
- **One giant contract file.** Split per endpoint, per consumer.
- **Contracts tested only on merge.** Run them on every consumer and provider PR.
- **No contract for internal services.** "It's internal so we don't need contracts" → integration hell.
