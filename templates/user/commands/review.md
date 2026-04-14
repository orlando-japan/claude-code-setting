---
description: Review a file, the staged diff, or a PR along four axes
argument-hint: [file path | "staged" | PR number]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(gh pr view:*), Bash(gh pr diff:*)
---

Review the target: **$ARGUMENTS**

- If the argument is a file path, review that file.
- If the argument is `staged` or empty, review `git diff --staged`.
- If the argument looks like a PR number, use `gh pr diff`.

**Four axes, in order:**

1. **Correctness** — does it do what it claims? Are there logic bugs, off-by-ones, wrong error handling, race conditions, edge cases missed?
2. **Security** — input validation, injection vectors, auth checks, secrets, logging of sensitive data, unsafe defaults.
3. **Readability** — can someone unfamiliar with this code understand it in one pass? Bad names, nested control flow, magic numbers.
4. **Performance** — only flag issues that matter at this code's actual scale. Don't micro-optimize hot-loop code you haven't measured.

**Output format:**

- Group findings by severity: **blocker**, **should-fix**, **nit**.
- For each finding: `path:line` reference, one-sentence description, one-sentence suggested fix.
- Nits are optional reading — keep them brief.
- End with a one-line verdict: "ship it" / "needs changes" / "blocked on X."

**Do NOT:**

- Rewrite the code. Review, don't re-author.
- Flag style issues the linter would catch. Trust the tooling.
- Invent problems. If you can't articulate a concrete failure mode, it's not a finding.
