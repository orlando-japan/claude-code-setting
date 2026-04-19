# Authoring agents

Agents live in `templates/claude-user/agents/*.md` and are copied to `~/.claude/agents/` on `init`. Claude Code spawns them as isolated subagents — they start with no session context and run with their own tool scope and model setting.

## When to add an agent vs a command vs a skill

| | Agent | Command | Skill |
|---|---|---|---|
| Context | None — starts cold | Full session context | Model-loaded on demand |
| Isolation | Yes — separate execution | No | No |
| Best for | Independent review, parallel research, tasks that shouldn't see session history | Interactive workflows the user triggers explicitly | Reusable playbooks loaded automatically |
| Parallelizable | Yes | No | No |

Add an agent when you need an independent perspective (code review, security audit) or want to protect the main session from a large, noisy result.

## Frontmatter

```markdown
---
name: <kebab-name>
description: <one sentence>. Use when <trigger>. [Use proactively when <condition>.]
tools: Read, Grep, Glob, Bash(git diff:*), ...
model: opus | sonnet | haiku
---
```

`name` must match the filename (without `.md`).

`description` is how the orchestrator decides when to spawn this agent. Write it as: *what it does* + *when to use it* + optionally *when to use it proactively*. Bad descriptions mean the agent never gets used.

- ✅ `"Independent code reviewer. Use proactively after any non-trivial set of code changes, or when the user asks for a review or second opinion."`
- ❌ `"Reviews code."`

`model` is required. Default to `opus` for review and reasoning work, `sonnet` for execution-heavy tasks (file edits, searches). Never use `haiku` for judgment-intensive work.

`tools` scopes what the agent may use. Narrower is safer — an agent that doesn't need Write shouldn't have it.

## Body

The body is the system prompt for the subagent. Write it as standing instructions, not a one-time briefing:

```markdown
---
name: example-reviewer
description: ...
tools: Read, Grep, Glob
model: opus
---

You are a <role>. Your job is to <goal>.

**Principles:**

- <short, opinionated stance>
- <short, opinionated stance>

**Output format:**

<clear structure — headings, severity labels, verdict line>

**What not to do:**

- <failure mode you've seen>
- <failure mode you've seen>
```

Rules:
- Lead with the role and goal. The agent starts with no context.
- Be opinionated: "find real problems" beats "look for potential issues."
- Output format matters — unclear format produces verbose, hard-to-read results.
- Keep it under ~60 lines. Long system prompts dilute focus.

## Adding an agent

1. Create `templates/claude-user/agents/<kebab-name>.md`.
2. Verify it installs: `HOME="$(mktemp -d)" node src/cli.js init --user` then check `~/.claude/agents/`.
3. Bump the package version (agents are user-facing; treat as a minor bump).

## Reviewing an agent PR

- **Description quality** — would the orchestrator know to spawn this from a real user request?
- **Tool scope** — is it minimal? Grant only what the workflow needs.
- **Model choice** — is `opus` justified, or would `sonnet` do?
- **Independence** — does the body assume session context the agent won't have? Fix it.
- **Overlap** — does this duplicate an existing agent? Extend rather than parallel.

## Removing or renaming an agent

Same pattern as commands: deprecate for one release, then remove. An agent rename is a breaking change for users who have customized the file locally.
