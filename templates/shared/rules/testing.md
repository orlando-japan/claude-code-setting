# Testing rules

## What to test

- **Behavior, not implementation.** A test that breaks when you rename a private method is a bad test. A test that breaks when the output changes is a good one.
- **The happy path, the edge, and the failure.** For any non-trivial function, these three. Skip only for truly trivial code.
- **The bug you just fixed.** Every bug fix ships with a test that would have caught the bug.

## Test pyramid

- **Unit (many).** Pure functions, small modules. Fast, isolated, no I/O.
- **Integration (some).** Real DB, real HTTP, real file system. Catches wiring bugs unit tests miss.
- **E2E (few).** Full stack through the UI. Expensive, slow, brittle — use sparingly for critical user flows.

If your pyramid is inverted (mostly e2e), the suite will be slow and flaky. Push tests down.

## Mocks

- **Mock at the boundary.** Mock HTTP calls, not your own functions.
- **Don't mock what you own.** Testing a wrapper around your own code by mocking the wrapped code tests nothing.
- **Integration tests hit real databases.** Mocked DBs let migration bugs through — past incidents have shown this.

## Fixtures

- **Minimal.** A test fixture should contain exactly what the test needs, no more. "Realistic" fixtures become a liability when they change.
- **Builders over dumps.** `makeUser({ role: 'admin' })` reads better than importing a 200-line JSON blob.
- **Deterministic.** No `Date.now()`, no `Math.random()`, no `new Date()` without a frozen clock.

## Flaky tests

- **Zero tolerance.** A flaky test is a broken test. Fix it or delete it — don't retry it.
- **Common causes:** async timing, shared state between tests, non-deterministic iteration order, hitting real external services.
- **If you can't fix it today, skip it with `.skip()` and a link to the issue.** Don't let it poison the rest of the suite.

## TDD

Not mandatory, but useful when:

- The requirement is clear and the design is not (tests force design decisions).
- You're fixing a bug (reproduce first as a failing test).
- The function has a small, well-defined interface.

Less useful when the interface itself is exploratory — write a sketch first, then add tests once you know the shape.
