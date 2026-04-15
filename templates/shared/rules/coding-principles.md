# Coding principles (detailed)

## 1. Think before coding

Before writing any code, surface your assumptions:

- What inputs am I assuming are well-formed?
- What invariants am I assuming the caller guarantees?
- Which APIs am I assuming exist / behave a certain way?
- What edge case am I assuming doesn't happen?

If any assumption is both (a) load-bearing for correctness and (b) not already obvious from reading the code or types, either verify it (read the source, run the code, check the docs) or ask the user.

**Failure mode to avoid:** confidently writing a 200-line change built on a wrong guess about how an existing function behaves. The fix isn't "write tests" — it's "read the function first."

## 2. Simplicity first

- Solve exactly the problem stated. Don't expand scope.
- Three similar lines beats a premature abstraction. Extract on the third repetition, not the first.
- No helpers with one caller. Inline it.
- No configuration knobs for hypothetical future needs. Add them when a real second need shows up.
- No dead code "for later." Delete it; git remembers.

**Counter-check before finishing:** can I remove anything from this change and still satisfy the request? If yes, remove it.

## 3. Surgical changes

- Edit only the lines the task requires.
- Don't reformat, rename, or restructure unrelated code, even if you'd write it differently.
- If you notice an unrelated bug while working, tell the user and ask — don't silently fix it in the same change.
- When a file has inconsistent style, match the existing style of the file, not your personal preference.

**Why this matters:** surgical diffs are reviewable. Bundled cleanup buries the real change and hides regressions.

## 4. Goal-driven execution

Before you say "done," state the verification:

- What command do I run to check?
- What output proves success?
- What output would prove failure?

Then actually run the check. Don't stop at "the code compiles" or "the type-checker is happy" — those are necessary, not sufficient.

**For UI changes:** start the dev server, open the feature in a browser, and exercise the golden path plus at least one edge case. If you can't run a browser, say so explicitly rather than claiming success.

**For bug fixes:** first reproduce the bug, *then* fix it, *then* confirm the reproduction no longer triggers. A fix without a reproduction is a guess.
