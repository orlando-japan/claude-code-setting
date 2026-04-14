# Architecture

`@company/claude-code-setting` is an npm package that installs a curated Claude Code harness onto an engineer's machine. It does not run inside Claude Code — it's an installer that drops files into `~/.claude/` and the project root, then steps out of the way.

## Two profiles

```
~/.claude/                         <-- user profile (cross-project)
├── CLAUDE.md                      imports rules/*.md
├── rules/                         5 domain rule files
├── commands/                      8 slash commands
├── agents/                        4 subagents
├── skills/                        33 core (+ 7 extras)
├── hooks/                         guard-bash.sh, guard-edit.sh
├── settings.json                  permissions + hooks + env
├── .mcp.json                      MCP server stub
└── .company-cc-manifest.json      hash of every installed file

<repo>/                            <-- project profile
├── CLAUDE.md                      project-specific overrides
├── .claude/                       (optional project assets)
└── .company-cc-manifest.json      project-level manifest
```

The two profiles are independent: you can run `init --user` once globally and `init --project` per repo, or only one of them. `update` discovers whichever manifests exist.

`doctor` treats these states differently on purpose:
- **fatal**: broken required install state (for example invalid `settings.json` after a manifest exists)
- **not initialized**: no user manifest yet; shown as guidance instead of a hard failure
- **optional missing**: integrations like OpenSpec are absent, but the harness itself is still healthy

## Layered harness

Adapted from the Karpathy "skills" pattern and shanraisshan's harness layout:

```
CLAUDE.md ─── short, <200 lines, points at everything below
   │
   ├── rules/*.md          always-loaded behavioral rules
   │
   ├── commands/*.md       user-invoked slash commands (/spec-propose, /commit-smart, …)
   │      │
   │      └── may delegate to ──> agents/*.md   (sub-agents w/ scoped tools)
   │                                  │
   │                                  └── may load ──> skills/*/SKILL.md  (playbooks)
   │
   ├── settings.json       permissions whitelist + PreToolUse hooks
   └── hooks/*.sh          run on tool events (block dangerous ops)
```

Each layer answers a different question:

| Layer | Question it answers |
|---|---|
| Rules | "How should you always behave in our codebase?" |
| Commands | "What does the user explicitly want done right now?" |
| Agents | "Who is the right sub-persona to do this?" |
| Skills | "Where's the playbook for this kind of work?" |
| Hooks | "What must never happen, no matter what the model decided?" |
| Permissions | "What can run without asking?" |

## Safe-overwrite via manifest

Updates use SHA-256 hashes, not 3-way merge:

1. Every install/update writes `.company-cc-manifest.json` mapping `relPath → sha256`.
2. On the next update, for each template file we hash the current file on disk:
   - matches manifest → safe to overwrite with new template
   - differs from manifest → user has edited it locally → skip with a warning
   - missing on disk → create
3. `--force` overrides the safety and overwrites locally-modified files.

This is intentionally simpler than git-style merge: no conflict markers, no half-merged states. If you want to keep a local edit, save it; if you want the upstream version, run `update --force` on that file.

## Distribution

- Package on npm; `bin: company-cc` is the only entry point.
- Templates ship inside the package under `templates/` and are read at runtime — no build step.
- OpenSpec is a `peerDependency`, not vendored. Engineers `npm i -g @fission-ai/openspec` separately so we always pick up upstream improvements.
- Node ≥20 (uses native ESM, `node:fs/promises`, no transpilation).

## Why npm and not a Claude Code plugin

- Same install path as our other CLI tooling — discoverable via `npm ls -g`.
- Versionable: `npm i -g @company/claude-code-setting@1.4.2` pins exactly.
- Reproducible: CI can install the same version a developer has.
- Doesn't depend on Claude Code's plugin loading conventions evolving.
