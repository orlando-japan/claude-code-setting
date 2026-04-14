---
name: refactor-surgical
description: Refactor while preserving observable behavior. Invoke when cleaning up code without wanting to change what it does.
category: coding
tags: [refactor, safety, discipline]
risk: medium
---

# Surgical refactor

The refactor contract: **behavior before == behavior after.** Only internal structure changes.

## Pre-flight

1. **Tests must be green.** A refactor on red isn't a refactor — it's a rewrite.
2. **There must be enough test coverage** that tests would catch a behavior change. If coverage is thin, write characterization tests first, then refactor.
3. **You must have a concrete reason.** "Cleaner" is not a reason. "Duplicated in 4 places, next change needs to happen in 5" is a reason.

## The protocol

1. **List the refactor in ≤5 steps** before touching code.
2. **Execute one step.**
3. **Run tests.** They must still pass.
4. **Commit.**
5. **Next step.**

If step 2 turns into "and also…", stop — you're scope-creeping. Split into another refactor.

## Safe refactors (tooling handles these)

- **Rename.** IDE rename, not search-and-replace.
- **Extract function.** Select the code, extract, run tests.
- **Inline function.** When a function has one caller and adds nothing.
- **Move symbol.** Between files, between classes.

These are almost always safe if tests cover the behavior.

## Risky refactors (do carefully)

- **Change a public API.** This isn't a refactor, it's a migration. Needs a spec and callers updated.
- **Change data structures.** Tests catch behavior, not performance or memory shape. Profile before *and* after.
- **Change concurrency model.** Tests rarely cover race conditions. Think hard.
- **Remove abstraction.** Removing an indirection can reveal behavior that depended on it.

## Never refactors

- **"Fix a bug while refactoring."** Refactor is behavior-preserving. Bug fixes change behavior. Separate them.
- **"Clean up while adding a feature."** Feature and cleanup in one PR = unreviewable. Split.
- **"Rename while restructuring."** Rename first, restructure second. Each on its own commit.

## Stop conditions

- Tests go red → revert the last step, diagnose, redo.
- You discover the original code was *wrong*, not just ugly → stop. Surface the bug separately.
- You need to touch public API → stop. This is a migration.
- Scope creep detected → stop. Commit what you have, start a new refactor.

## After

- Run the full test suite, not just focused ones.
- Measure: is the code actually simpler? Count LOC, cyclomatic complexity, or "how long does it take to explain this to a new contributor." If the answer is "the same," you refactored for refactor's sake.
