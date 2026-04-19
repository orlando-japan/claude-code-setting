# @company/claude-code-setting

Company-wide AI coding harness. One install gives every engineer a consistent setup: shared rules and skills, plus target-specific Claude Code or Codex profile files.

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
npm i -g ./company-claude-code-setting-*.tgz

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
# Default: install the Claude user profile (~/.claude/) and Claude project file (./CLAUDE.md)
company-cc init

# Install Codex user assets into $CODEX_HOME or ~/.codex
company-cc init --user --target codex

# Install both Claude and Codex user profiles
company-cc init --user --target both

# Just the project-level assets
company-cc init --project

# Install both project instruction files
company-cc init --project --target both

# Add all 7 opt-in advanced skills
company-cc init --user --extras

# Add only specific skills (use skill directory names)
company-cc init --user --extras=evals-design,infra-as-code

# Pull latest templates (skips files you've edited locally;
# remembers --extras choice from your manifest)
company-cc update

# Force overwrite of files you've locally modified
company-cc update --force

# Preview what would change without writing any files
company-cc update --dry-run

# Verify install state. Doctor separates fatal issues,
# optional integrations, and "not initialized yet" guidance.
# Also validates settings.json has required "permissions" key.
company-cc doctor

# Show every tracked file and its state (unchanged / locally-modified / missing)
company-cc status

# Show a unified diff between your local copy and the template version
company-cc diff rules/code-style.md

# Restore a single file to the template version (prompts for confirmation)
company-cc restore rules/code-style.md

# Preview what uninstall would remove (no files touched)
company-cc uninstall

# Actually remove all harness-managed files from ~/.claude/
company-cc uninstall --confirm

# Show available backups (update creates one automatically before each run)
company-cc rollback --list

# Preview what rollback would restore (dry-run)
company-cc rollback

# Restore from the most recent backup
company-cc rollback --confirm

# CI check: exits non-zero if project instruction file is missing or still a stub
company-cc ci

# Machine-readable output for CI wrappers
company-cc doctor --json
company-cc status --json
company-cc ci --json
```

Files you've edited yourself are detected via SHA-256 in a target-specific manifest
(`~/.claude/.company-cc-manifest.json` for Claude, `~/.codex/.company-cc-codex-manifest.json`
for Codex by default) and skipped on update unless you pass `--force`. New template files are always added.

## What you get

| Layer | Content |
|---|---|
| **Shared** (`templates/shared/`) | 9 global rules plus 33 core skills installed for both Claude and Codex targets |
| **Claude-only** (`templates/claude-user/`, `templates/claude-project/`) | `CLAUDE.md`, slash commands, agents, settings, MCP stub, hooks |
| **Codex-only** (`templates/codex-user/`, `templates/codex-project/`) | `AGENTS.md` user and project scaffolds |
| **Extras** (`templates/extra/`) | 7 opt-in advanced skills (`--extras`) shared across targets |

## How to use the harness

Once installed, the harness loads automatically every time you start Claude Code. Day-to-day use falls into three modes.

### 1. Everyday coding (passive)

Just start Claude Code and make a request. Behind the scenes the session picks up:
- The four coding principles in `CLAUDE.md` (Think → Simplicity → Surgical → Goal-driven)
- Seven always-on rules: `coding-principles`, `code-style`, `security`, `error-handling`, `observability`, `commit-conventions`, `testing`
- Two opt-in rules available for teams that need them: `api-design`, `data-access`
- 33 core skills, chosen on demand by the model based on the task
- `PreToolUse` guard hooks on `Bash` and `Write|Edit|MultiEdit` that block obviously-dangerous commands

What you'll notice: shorter replies, less over-engineering, fewer "while I'm in here" refactors, dangerous shell commands refused.

### 2. Slash commands (manual triggers)

Type `/` in the Claude Code prompt to see them. The shipped ones:

| Command | When to use |
|---|---|
| `/review` | Review a file, the staged diff, or a PR along four axes |
| `/commit-smart` | Stage the right files and write a conventional commit from the diff |
| `/test-focused` | Run only the tests relevant to recently changed files |
| `/refactor-surgical` | Refactor while preserving observable behavior |
| `/doctor` | Verify the harness is installed and active |
| `/spec:propose` / `/spec:apply` / `/spec:archive` | Spec-driven feature flow (requires OpenSpec) |

### 3. Spec-driven feature flow (OpenSpec)

For features only — bug fixes and small edits should skip this flow. Requires `npm i -g @fission-ai/openspec`.

```
/spec:propose   → draft a change spec under openspec/changes/<name>/
                  (review the spec with a human before moving on)
/model sonnet   → swap to a cheaper executor
/spec:apply     → implement the tasks listed in the approved spec
/spec:archive   → merge the change into openspec/specs/ as the canonical spec
```

The `CLAUDE.md` default is **Opus for planning, Sonnet for execution** — use `/model` to swap between phases.

### Recommended first steps after install

1. Restart Claude Code so the new settings, hooks, and skills load.
2. Run a small task ("add a unit test for function X") and confirm the response stays short and surgical.
3. Try `/commit-smart` on a real diff to see the commit-message flow.
4. Save the spec flow for your next actual feature, not a warm-up task.

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
- `doctor` is intentionally calm before first install: missing optional tooling or a missing target manifest shows as guidance, not a fatal failure.
- The isolated `HOME` flow above is the real install/update smoke path; use it when changing installer behavior.

### Repo layout

```text
src/                 CLI entrypoint + install/update/doctor logic
templates/           shipped harness templates
docs/                architecture + authoring guidance
test/                minimal smoke and template safety tests
```

## Design philosophy

This repo is designed as a **company-wide AI coding harness skeleton**, not as a fully opinionated monolith and not as a fake "complete project handbook".

Core ideas:
- **One shared baseline**: rules and skills should install consistently for every engineer regardless of tool.
- **Provider adapters stay thin**: Claude-specific commands/hooks/settings and Codex-specific entry files live in separate template roots.
- **Project context stays project-specific**: project instruction files should stay short, honest, and high-signal.
- **Safe updates over clever merges**: the manifest-based SHA-256 strategy is intentionally simple; local edits are skipped instead of being half-merged.
- **Docs should reflect reality**: this repo prefers a small number of maintained entry docs over many overlapping helper files.
- **Private/internal distribution first**: this package is valid as a local install, local tarball install, or private npm package before it ever needs public npm.

### Project template philosophy

The shipped project templates (`templates/claude-project/CLAUDE.md` and `templates/codex-project/AGENTS.md`) are intentionally **short, hard skeletons** — not fake fully-written onboarding docs.

Its job is to force each repo to answer a few high-value questions consistently:
- what this project is
- how to run and verify it
- which paths matter first
- what the current priorities are
- what guardrails or danger zones exist

If a project needs richer explanation, put that in `docs/` and link it from the project instruction file instead of turning the template itself into a long essay.

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
- unknown `--flag` typos are rejected with a clear error before install runs
- `update` correctly warns when manifest is missing but home directory exists
- Codex and Claude target templates still install into separate homes without manifest collisions
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
- skips (with a warning) files you've edited locally — diff them and re-apply with `--force` when ready,
- warns if `~/.claude` exists but the manifest is missing (e.g. accidentally deleted) and tells you to re-run `init` to restore it.

## Team overlays

Place a `.company-cc.json` in your home dir (for user-profile overlays) or project root (for project-profile overlays):

```json
{
  "overlays": ["./team-templates", "@yourorg/harness-addons"]
}
```

Files in the overlay directory mirror the target home structure and are installed after the base templates. See [Authoring overlays](docs/authoring-overlays.md) for the full reference.

## Docs

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Authoring rules](docs/authoring-rules.md)
- [Authoring skills](docs/authoring-skills.md)
- [Authoring commands](docs/authoring-commands.md)
- [Authoring agents](docs/authoring-agents.md)
- [Authoring hooks](docs/authoring-hooks.md)
- [Authoring overlays](docs/authoring-overlays.md)
- [Authoring target adapters](docs/authoring-targets.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
