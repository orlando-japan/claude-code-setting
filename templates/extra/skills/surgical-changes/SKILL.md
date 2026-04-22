---
name: surgical-changes
description: Edit only the minimum lines needed. Leave unrelated code alone even if you'd write it differently. Invoke for any bug fix or small feature where scope discipline matters.
category: coding
group: core
tags: [discipline, review, diff-hygiene]
risk: low
---

# Surgical changes

The goal of a surgical change: the diff is small, focused, and obviously correct. Reviewers shouldn't have to wonder which lines are the "real" change.

## Apply when

- Fixing a bug.
- Making a targeted feature addition.
- Any change that will be reviewed (which is all of them).

## Rules

1. **Touch only lines the task requires.** If you find yourself about to edit a file the task doesn't mention, stop and justify.
2. **Don't reformat.** If the file uses 2-space indent and you prefer 4, use 2. If it uses `let` and you prefer `const`, use `let`. Match what's there.
3. **Don't rename unrelated things.** A rename is its own commit.
4. **Don't re-order.** Reordering declarations, imports, or methods for aesthetic reasons adds noise to the diff.
5. **Don't add unrelated tests.** Fix your bug with its regression test. That's it.
6. **Don't remove unrelated dead code.** Put it on a todo list; do it separately.
7. **If you notice a real bug unrelated to the task, stop and tell the user.** Don't silently fix it in the same change.

## Before committing

Look at the diff. For every hunk, ask: **"Does this line directly implement the task?"** If the answer is no or "sort of," revert that hunk.

Typical cuts:
- Whitespace-only changes → revert.
- Import re-sorting → revert.
- Comment rewording → revert unless the comment was actively wrong.
- Variable renames → revert unless ambiguity was causing the bug.
- "Cleanup" of unrelated logic → revert and file a separate ticket.

## Exception — fixing on the way through

Rarely, small unrelated fixes inside a file you're already touching are acceptable:

- Obvious typo in a string literal that will ship in UI.
- Misleading comment right next to your change that would confuse the reviewer.
- `console.log` left over from someone else's debugging in code you're editing.

Call these out explicitly in the commit body: "Also fixed X — unrelated but one-line."

## Why this matters

Small diffs are reviewable. A review that finds a real bug is worth more than a diff that silently improves ten things. Bundled cleanup also attributes blame wrong when `git blame` runs.
