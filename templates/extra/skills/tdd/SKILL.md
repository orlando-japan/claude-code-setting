---
name: tdd
description: Red → green → refactor discipline. Invoke when requirements are clear, the interface is small, or when fixing a bug that needs a reproduction.
category: testing
group: workflow
tags: [tdd, testing, discipline]
risk: low
---

# Test-driven development

TDD isn't ideology — it's a tool. Use it where it earns its keep.

## Use TDD when

- The interface is clear (input → output), the algorithm is what's uncertain.
- You're fixing a bug (write the failing test that reproduces, then fix).
- You're touching load-bearing code without existing test coverage.

## Don't use TDD when

- The interface itself is exploratory — write a sketch first, then tests once the shape settles.
- You're doing throwaway research / spikes.
- The cost of testing exceeds the cost of rewriting (rare in practice, real in prototyping).

## The cycle

**Red:**

1. Write one test for the next smallest unverified behavior.
2. Run it. It must fail, and fail for the expected reason ("function not defined" is fine; "typo in import" is not — fix the typo, re-run).

**Green:**

1. Write the simplest code that makes this test pass. Not the cleanest, not the most general — the simplest.
2. Run the test. Green.
3. Run all the previous tests. Still green.

**Refactor:**

1. Look at the code. Can you remove duplication without changing behavior?
2. Refactor. Run the tests after *every* change, not at the end.
3. If a refactor breaks tests, the refactor was wrong — revert.

Repeat.

## Rules

- **One test at a time.** No batching "let me write ten tests first."
- **One assertion per concept** (not per line). A test for "login redirect" can assert location *and* that the cookie was set — they're one concept.
- **Tests name behaviors, not methods.** `'redirects logged-out users to /login'` beats `'test_login_handler'`.
- **Delete failing-and-never-fixed tests.** Don't `.skip()` and forget. Fix or cut.

## Bug-fix TDD

Special case, highly recommended:

1. Reproduce the bug with a test (red).
2. Confirm the test fails *for the bug's reason*, not some other reason.
3. Fix the bug.
4. Test goes green.
5. The test is now a regression test; keep it.

This produces bug fixes that can't silently regress.

## When tests are hard to write

Hard-to-test code is usually telling you something:

- Too many responsibilities → split it.
- Hidden dependencies → inject them.
- Time/randomness inside → extract to a seam.
- Global state → make it explicit.

If the test is hard, fix the design, don't fight the test.
