---
name: code-review
description: Review code along correctness, security, readability, and performance. Invoke when reviewing a diff, a PR, a file, or before declaring a change done.
category: review
tags: [review, quality, security]
risk: low
---

# Code review

Reviews find real problems. They don't rewrite code or bikeshed style.

## Four axes, in order

1. **Correctness** — does it do what it claims?
2. **Security** — can it be exploited?
3. **Readability** — can the next person understand it?
4. **Performance** — does it matter at this code's actual scale?

Correctness before style. Security before correctness? No — a correct-and-exploitable function is still a correctness failure.

## Correctness checklist

- Logic: off-by-one, wrong operator, inverted condition, wrong default.
- Error handling: swallowed errors, errors thrown into the void, errors used for control flow.
- Edge cases: empty list, null, zero, negative, unicode, timezone, leap year.
- Concurrency: races, deadlock, lost update, stale read.
- Lifecycle: cleanup, cancellation, resource leak.
- API contract: matches what callers assume.

## Security checklist

- Input validation at trust boundaries.
- Injection: SQL, shell, template, HTML, JSON-in-URL.
- Auth: authentication vs authorization, IDOR, privilege checks in UI only (bad).
- Secrets: logs, errors, git history.
- Crypto: homegrown, weak RNG, missing verification.
- Dependency: known CVE, typo-squat, postinstall.

## Readability checklist

- Names: does the name tell you *why*, not just *what*?
- Nesting: more than 3 levels = flatten.
- Function length: more than a screen = split.
- Comments: do they add non-obvious *why*, or narrate *what*?
- Don't flag what the linter catches.

## Performance — only if it matters

Don't flag:

- `O(n)` where `n < 100`.
- `for` vs `map` style choices.
- String concatenation in code that runs once.

Do flag:

- `O(n²)` loops where `n` can be large.
- DB queries inside loops (N+1).
- Sync I/O in a hot request path.
- Unbounded memory growth.

## Output

Group findings by severity:

- **Blocker** — would ship a real bug or exploit.
- **Should fix** — would cause confusion or minor issues.
- **Nit** — style, naming, optional.

For each: `path:line` + one-sentence problem + one-sentence fix. End with a verdict: **ship / changes needed / blocked**.

## Anti-patterns

- Rewriting the code in the comment ("here's how I'd write it" is not a review).
- "Consider adding tests" as a blanket blocker.
- Inventing problems to pad the review.
- Hedging ("maybe you might want to…"). Be direct: "this is wrong because X."
- Endless back-and-forth on style. Defer to the linter or the team doc.
