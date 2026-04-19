# Authoring slash commands

Slash commands live in `templates/claude-user/commands/*.md` and are copied to `~/.claude/commands/` on `init`. They appear in Claude Code when the user types `/` and are executed directly in the active session — no subagent spin-up.

## When to add a command vs a skill

| | Command | Skill |
|---|---|---|
| Trigger | User types `/name` | Model loads on demand from description match |
| Context | Full session context | Starts with limited context |
| Best for | Interactive, stateful workflows (diff → stage → commit) | Reusable playbooks the model self-selects |
| Argument support | `$ARGUMENTS` | n/a |

Add a command when the user needs to invoke the workflow explicitly and pass arguments. Add a skill when the workflow should activate automatically based on the task description.

## Frontmatter

Every command file starts with YAML frontmatter:

```markdown
---
description: <one sentence shown in the / picker>
argument-hint: [optional description shown after the command name]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), ...
---
```

`allowed-tools` scopes what tools the command may call. List only what the workflow actually uses — narrower is safer.

`argument-hint` is optional. Show it when the command takes meaningful user input, e.g. `[file path | "staged" | PR number]`.

## Body

The body is the prompt injected when the user runs the command. Write it as if briefing a colleague:

```markdown
---
description: Do X from the current working state
allowed-tools: Bash(git status:*), Bash(git diff:*), Read
---

Do X using **$ARGUMENTS** as the target.

**Step 1 — inspect:**
<what to read first>

**Step 2 — act:**
<what to do>

**Do NOT:**
- <sharp constraint>
- <sharp constraint>
```

Rules:
- Use `$ARGUMENTS` wherever the user's input should be spliced in.
- Lead with the goal, not the steps. Steps come after.
- End with explicit **Do NOT** items for the failure modes you've actually seen.
- Keep it under ~40 lines. If longer, it's probably a skill.

## Adding a command

1. Create `templates/claude-user/commands/<kebab-name>.md`.
2. Verify it installs: `HOME="$(mktemp -d)" node src/cli.js init --user` then check `~/.claude/commands/`.
3. Add it to the commands table in `README.md` (the "How to use the harness" section).
4. Bump the package version (commands are user-facing; treat as a minor bump).

## Reviewing a command PR

- Does the description match what a user would type `/` and then search for?
- Is `allowed-tools` minimal — does it grant only what the workflow needs?
- Is `$ARGUMENTS` used where user input flows in? Does it sanitize anything sensitive?
- Does it duplicate an existing command? Extend rather than parallel.
- Is the body under ~40 lines? If not, should this be a skill instead?

## Removing or renaming a command

Renames are breaking: users on older installs keep the old file until `update --force`. Preferred path:
1. Add the new name.
2. Mark the old file deprecated with `description: "(deprecated — use /new-name)"` for one release.
3. Remove the old file in the following release and note it in the changelog.
