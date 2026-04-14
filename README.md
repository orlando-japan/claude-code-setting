# @company/claude-code-setting

Company-wide Claude Code harness. One install gives every engineer a consistent setup: shared coding rules, spec-driven workflow, curated skills, subagents, and safe permissions.

## Status

Current repo status:
- CLI entrypoint is runnable
- template installer / updater / doctor flows are wired
- minimal automated tests are present
- packaging is suitable for a private npm/internal distribution flow

Still intentionally lightweight:
- no bundled build step
- OpenSpec remains an optional peer dependency
- release verification is based on repo tests plus `npm pack --dry-run`, not a custom publish script

## Install

```bash
npm i -g @company/claude-code-setting
# optional, for spec workflow
npm i -g @fission-ai/openspec
```

## Quick start

```bash
# Default: install both user (~/.claude/) and project (./.claude/, ./CLAUDE.md)
company-cc init

# Just the user-level assets
company-cc init --user

# Just the project-level assets
company-cc init --project

# Add the 7 opt-in advanced skills (ops, frontend, infra, evals)
company-cc init --user --extras

# Pull latest templates (skips files you've edited locally;
# remembers --extras choice from your manifest)
company-cc update

# Force overwrite of files you've locally modified
company-cc update --force

# Verify install state. Doctor now separates fatal issues,
# optional integrations, and "not initialized yet" guidance.
company-cc doctor
```

Files you've edited yourself are detected via SHA-256 in the manifest at
`~/.claude/.company-cc-manifest.json` and skipped on update unless you
pass `--force`. New template files are always added.

## What you get

| Layer | Content |
|---|---|
| **Rules** (`rules/`) | 5 domain guides imported by `CLAUDE.md`: coding principles, style, security, commit conventions, testing |
| **Commands** (`commands/`) | 8 slash commands including spec workflow (`/spec-propose`, `/spec-apply`, `/spec-archive`) |
| **Agents** (`agents/`) | 4 subagents: `code-reviewer`, `spec-writer`, `test-runner`, `security-auditor` |
| **Skills** (`skills/`) | **33 core** playbooks (coding, review, architecture, security, workflow, AI, a11y) + **7 opt-in extras** (`--extras`): contract-testing, tracing-setup, alerting-hygiene, release-playbook, frontend-performance, infra-as-code, evals-design |
| **Harness** (`settings.json`) | Wildcard permissions, PreToolUse guards on Bash/Edit, default model strategy, MCP stub |
| **Hooks** (`hooks/`) | `guard-bash.sh` blocks destructive commands; `guard-edit.sh` blocks writes to secrets/keys/`.git` |

## Development

```bash
npm test
node src/cli.js --help
node src/cli.js doctor
TMP_HOME="$(mktemp -d)"
HOME="$TMP_HOME" node src/cli.js init --user
HOME="$TMP_HOME" node src/cli.js update
rm -rf "$TMP_HOME"
```

Notes:
- `doctor` is intentionally calm before first install: missing optional tooling or a missing `~/.claude/` manifest shows as guidance, not a fatal failure.
- The isolated `HOME` flow above is the real install/update smoke path; use it when changing installer behavior.

### Repo layout

```text
src/                 CLI entrypoint + install/update/doctor logic
templates/           shipped harness templates
docs/                architecture + authoring guidance
test/                minimal smoke and template safety tests
```

### Project template philosophy

The shipped `templates/project/CLAUDE.md` is intentionally a **short, hard skeleton** — not a fake fully-written onboarding doc.

Its job is to force each repo to answer a few high-value questions consistently:
- what this project is
- how to run and verify it
- which paths matter first
- what the current priorities are
- what guardrails or danger zones exist

If a project needs richer explanation, put that in `docs/` and link it from the project `CLAUDE.md` instead of turning the template itself into a long essay.

## Release / publish checklist

Before calling this repo “ready for release”, verify:
- `npm test` passes
- `node src/cli.js --help` prints usage
- isolated real install/update smoke passes with a temporary `HOME`
- `npm pack --dry-run` includes only the intended publish payload
- `.claude/settings.local.json` is not committed
- package version is bumped intentionally
- `package.json` metadata (`repository`, `homepage`, `bugs`, `bin`, `files`) still matches reality
- README and template docs reflect the actual shipped behavior

## Upgrading

```bash
npm i -g @company/claude-code-setting@latest
company-cc update
```

Update walks each manifest, hashes every tracked file, and:

- writes new files added by the upgrade,
- overwrites template files you haven't touched,
- skips (with a warning) files you've edited locally — diff them and re-apply with `--force` when ready.

## Docs

- [Architecture](docs/architecture.md)
- [Authoring rules](docs/authoring-rules.md)
- [Authoring skills](docs/authoring-skills.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
