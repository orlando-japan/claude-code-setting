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

## Recommended installation path

- **If you are actively building this repo on your own machine**: use `npm link`
- **If you want a teammate to try it before formal publishing**: use a local tarball or a private npm registry
- **If you want repeatable internal team distribution**: publish to your private npm registry and install from there

In other words: local development first, private distribution second, public npm only if you actually need it.

## Install

### Option A — install from npm / private npm

```bash
npm i -g @company/claude-code-setting
# optional, for spec workflow
npm i -g @fission-ai/openspec
```

### Option B — download the repo locally, then install from your local files

If you are not publishing to the public npm registry yet, local install is completely fine.

#### B1. Fast local development mode (`npm link`)

Best when you are actively editing this repo and want the command available immediately.

```bash
git clone https://github.com/orlando-japan/claude-code-setting.git
cd claude-code-setting
npm install
npm link

# now the command is available globally
company-cc --help
```

#### B2. Install from a packed local tarball

Best when you want to simulate a real package install without publishing.

```bash
git clone https://github.com/orlando-japan/claude-code-setting.git
cd claude-code-setting
npm install
npm pack
npm i -g ./company-cc-*.tgz

# verify
company-cc --help
```

#### B3. Install from a local / private npm registry

If your team already has Verdaccio, GitHub Packages, or another internal npm registry, this package is suitable for that workflow too.

Typical flow:

```bash
# publish to your internal registry first
npm publish --registry <your-private-registry>

# then install from that registry
npm i -g @company/claude-code-setting --registry <your-private-registry>
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

## Design philosophy

This repo is designed as a **company-wide Claude Code harness skeleton**, not as a fully opinionated monolith and not as a fake "complete project handbook".

Core ideas:
- **One shared baseline**: user-level rules, commands, agents, skills, hooks, and settings should install consistently for every engineer.
- **Project context stays project-specific**: `templates/project/CLAUDE.md` should stay short, honest, and high-signal.
- **Safe updates over clever merges**: the manifest-based SHA-256 strategy is intentionally simple; local edits are skipped instead of being half-merged.
- **Docs should reflect reality**: this repo prefers a small number of maintained entry docs over many overlapping helper files.
- **Private/internal distribution first**: this package is valid as a local install, local tarball install, or private npm package before it ever needs public npm.

### Project template philosophy

The shipped `templates/project/CLAUDE.md` is intentionally a **short, hard skeleton** — not a fake fully-written onboarding doc.

Its job is to force each repo to answer a few high-value questions consistently:
- what this project is
- how to run and verify it
- which paths matter first
- what the current priorities are
- what guardrails or danger zones exist

If a project needs richer explanation, put that in `docs/` and link it from the project `CLAUDE.md` instead of turning the template itself into a long essay.

## Inspirations / references

This repo was shaped by a few prior patterns and references:
- **Karpathy-style "skills" pattern** — using reusable, on-demand playbooks instead of stuffing everything into one always-loaded prompt.
- **shanraisshan harness layout ideas** — layered structure for rules, commands, agents, skills, and supporting files.
- **OpenSpec workflow** — kept as an optional peer dependency instead of being bundled, so spec-driven teams can opt in without forcing it on every install.
- **Manifest-based installer design** — explicit file hashing and safe overwrite behavior instead of trying to do fragile automatic merges.

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
