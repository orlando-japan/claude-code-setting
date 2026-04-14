---
name: simplicity-first
description: Solve exactly what was asked with the minimum code. Invoke when tempted to add abstractions, helpers, flags, or handling for hypothetical future cases.
category: coding
tags: [minimalism, design, discipline]
risk: low
---

# Simplicity first

The default LLM failure mode is overbuilding. This skill is the counterweight.

## Apply when

- You're about to add a helper, interface, or base class.
- You're adding a config flag "in case."
- You're handling an error that can't actually occur.
- You're refactoring something unrelated because you're "already in the file."

## The five checks

Before writing a piece of code, ask:

1. **Does this line of code exist to satisfy the actual request?** If not, delete it.
2. **Is this abstraction pulling its weight today?** One caller = inline it. Three callers that look similar = probably extract. Two = think about it.
3. **Am I handling a case that can happen?** If the type system, the caller, or the framework already guarantees it, drop the handler.
4. **Am I adding a knob for a future need I can't name?** Remove the knob. Add it when the second real need shows up.
5. **Would deleting this make the code wrong?** If no, it's dead weight.

## Concrete targets to cut

- **Dead branches.** `if (!x) return;` when `x` is guaranteed non-null by the type.
- **Trivial wrappers.** `function getName(u) { return u.name; }` — just use `u.name`.
- **Speculative configs.** `retryCount: options.retryCount ?? 3` when nothing passes `retryCount`.
- **Empty tests.** A test that calls the function and asserts nothing useful.
- **Boilerplate comments.** `// Initialize the variable` above `const x = 0`.

## Counter-pressure

The principle isn't "never abstract" — it's "abstract on demand." When you extract, it should be because concrete code duplication was hurting, not because abstraction *might* pay off later.

## Done check

Before committing: re-read the diff and remove anything that, if deleted, would still satisfy the task. If you can't remove anything, you've probably gone too far the other way.
