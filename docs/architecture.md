# Architecture

`@company/claude-code-setting` is an npm package that installs a curated AI coding harness onto an engineer's machine. It does not run inside Claude Code or Codex; it copies template files into target homes and project roots, writes a manifest, and then gets out of the way.

## Target model

The repository is split into shared and provider-specific template roots:

```text
templates/shared/          shared rules + core skills
templates/extra/           opt-in shared skills
templates/claude-user/     Claude-specific user assets
templates/claude-project/  Claude-specific project file
templates/codex-user/      Codex-specific user assets
templates/codex-project/   Codex-specific project file
```

Today the installer supports these targets:

```text
Claude user:   ~/.claude/
Claude project: <repo>/CLAUDE.md

Codex user:    $CODEX_HOME or ~/.codex/
Codex project: <repo>/AGENTS.md
```

Shared assets such as `rules/` and `skills/` install into both user homes. Provider-specific files stay isolated.

## Manifests

Each target keeps its own manifest so Claude and Codex installs can coexist:

```text
~/.claude/.company-cc-manifest.json
~/.codex/.company-cc-codex-manifest.json
<repo>/.company-cc-manifest.json
<repo>/.company-cc-codex-manifest.json
```

`update` discovers whichever manifests exist for the selected target set.

`doctor` treats states differently on purpose:
- **fatal**: broken required install state after a manifest exists
- **not initialized**: target home exists but the harness was never installed
- **optional missing**: integrations like OpenSpec are absent, but the harness itself is healthy

## Layering

The shared/provider split is intentional:

| Layer | Purpose |
|---|---|
| Shared rules | Always-relevant engineering defaults |
| Shared skills | Reusable playbooks loaded on demand |
| Claude adapter | `CLAUDE.md`, commands, agents, hooks, settings, MCP stub |
| Codex adapter | `AGENTS.md` user/project entry files |
| Extra skills | Domain-specific opt-in playbooks |

This keeps most guidance portable while letting each tool keep its own surface area.

## Safe-overwrite via manifest

Updates use SHA-256 hashes, not 3-way merge:

1. Every install/update writes a target-specific manifest mapping `relPath → sha256`.
2. On the next update, for each template file we hash the current file on disk:
   - matches manifest → safe to overwrite with the new template
   - differs from manifest → user has edited it locally → skip with a warning
   - missing on disk → create
3. `--force` overrides the safety and overwrites locally-modified files.

This avoids conflict markers and half-merged states.

## Distribution

- Package on npm; `bin: company-cc` is the only entry point.
- Templates ship inside the package under `templates/` and are read at runtime.
- OpenSpec is a `peerDependency`, not vendored.
- Node ≥20, native ESM, no build step.

## Why npm and not a plugin

- Same install path as other CLI tooling.
- Versionable and pin-friendly.
- Reproducible in CI.
- The shared harness can target multiple tools without depending on one provider's plugin system.
