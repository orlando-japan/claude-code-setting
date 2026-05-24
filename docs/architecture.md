# Architecture

`@company/claude-code-setting` is an npm package that installs a curated AI coding harness onto an engineer's machine. It does not run inside Claude Code or Codex; it copies template files into target homes and project roots, writes a manifest, and then gets out of the way.

Navigation note:
- Product entrypoint: `../README.md`
- Documentation Home: `README.md`
- Target semantics authority: `authoring-targets.md`

This file is the **technical architecture source of truth** for lifecycle and internal execution flow.

## Mental model

Treat the package as a small control plane for AI coding environments:

- **target adapter layer** → Claude / Codex / custom targets define where files go and which entry files matter
- **runner layer** → template files are copied with safe-overwrite semantics and manifest tracking
- **governance payload layer** → rules, skills, hooks, commands, and instruction files become the installed surface area

For maintainers, the implementation is now also intentionally split into:

1. **plan**
   - `src/lib/profile-plans.js`
   - decides which target/profile combinations should run for `init` and `update`
2. **runner**
   - `src/lib/profile-runner.js`
   - applies template sources, tracks counts, and finalizes manifest metadata
3. **cleanup**
   - `src/lib/update-cleanup.js`
   - handles update-only post-processing such as removing stale skills after extras selection changes

This split keeps command orchestration thinner and makes planning, application, and cleanup independently testable.

## Target model

The repository is split into shared and provider-specific template roots:

```text
templates/shared/          shared rules
templates/extra/           44 opt-in skills in 6 groups (core, review, workflow, design, ops, dx)
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

Shared assets such as `rules/` install into both user homes. Provider-specific files stay isolated. Skills are opt-in extras installed on request via `--extras`.

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
| Shared rules | Always-relevant engineering defaults (always installed) |
| Claude adapter | `CLAUDE.md`, commands, agents, hooks, settings, MCP stub, and a project-level docs governance workflow |
| Codex adapter | `AGENTS.md` user/project entry files |
| Extra skills | 44 opt-in playbooks in 6 groups — install by group or skill name via `--extras`; manage with `skills list/remove` |

This keeps most guidance portable while letting each tool keep its own surface area.

## Install/update execution flow

At a high level:

```text
CLI command
  -> target/profile plan builder
  -> per-profile runner
  -> optional update cleanup
  -> manifest + lifecycle output
```

### `init`
- resolves target scope and install scope (`user`, `project`, or both)
- resolves extras selection
- builds install plans
- runs each plan through the shared runner
- makes hook scripts executable when needed

### `update`
- discovers existing manifests for selected targets
- rebuilds per-profile update plans
- rehydrates extras selection, including legacy manifest migration
- runs each plan through the shared runner
- performs cleanup for stale skills when extras narrow
- writes updated manifest metadata and preserves rollback safety

### `explain`
- exposes plan output for `init` and `update` without mutating files
- exposes file provenance for tracked files via `explain path <relPath>`
- reuses real manifest / source / plan objects instead of a parallel explanation model

### lifecycle `--json`
- `init`, `update`, `rollback`, and `uninstall` now emit machine-readable summaries
- `doctor`, `status`, `ci`, and `verify-release` form the audit / operator JSON surface
- JSON mode must stay quiet at the runner layer so structured output is never polluted by text logs

### `verify-release`
- gives operators one formal pre-release gate instead of ad hoc shell ritual
- runs `node src/cli.js --help` as a CLI entrypoint smoke check
- runs `npm test --silent`
- runs `npm pack --dry-run --json`
- checks that required product/docs entry files are actually present in the tarball

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
