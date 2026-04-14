---
description: Verify the company Claude Code harness is correctly installed and active
allowed-tools: Bash(company-cc doctor:*), Bash(ls:*), Bash(cat:*), Read, Glob
---

Run a health check on the current Claude Code harness.

**Checks to perform:**

1. `company-cc doctor` — run the CLI check and report its output.
2. Verify `~/.claude/CLAUDE.md` exists and imports the five rule files.
3. Verify `~/.claude/settings.json` is valid JSON and has a `permissions.allow` list.
4. Verify the `rules/`, `commands/`, `agents/`, `skills/` directories exist with expected content.
5. If OpenSpec is in use, verify `openspec --version` works and there is an `openspec/` directory in the current project.
6. Verify any hooks referenced by `settings.json` are executable.

**Output format:**

- One line per check: ✓/✗ + name + 1-line detail
- Summary at the end: "all checks passed" or "N failed — run `company-cc init --user` to repair"

Do **not** modify anything in this command. It is read-only diagnostics. If something is broken, tell the user how to fix it and let them decide.
