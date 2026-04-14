# @company/claude-code-setting

Company-wide Claude Code harness. One install gives every engineer a consistent setup: shared coding rules, spec-driven workflow, curated skills, subagents, and safe permissions.

## Install

```bash
npm i -g @company/claude-code-setting
# (optional, for spec workflow)
npm i -g @fission-ai/openspec
```

## Use

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

# Verify install, permissions, and OpenSpec availability
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

## License

MIT
