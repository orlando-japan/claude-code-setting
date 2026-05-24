# Documentation Home

Language versions:
- English: `README.md`
- 简体中文: `README.zh-CN.md`

This directory is the product-facing documentation layer for `@company/claude-code-setting`.

If you are new here, do **not** start by reading files at random.
Use the role paths or goal-based entrypoints below.

## First 15 minutes

If you only have 15 minutes, use this path:

1. `../README.md`
   - understand what the package is and why it exists
2. `architecture.md`
   - understand the lifecycle and the `plan -> runner -> cleanup` split
3. `authoring-targets.md`
   - understand Claude vs Codex and how target adapters fit the shared control plane
4. `../README.md` command examples for `explain` and lifecycle `--json`
   - see the current introspection and automation-facing surface

At that point you should be able to answer:
- what this package installs
- how updates stay safe
- why Claude and Codex differ without breaking governance parity
- where to read next for your own role

## Authoritative docs / source-of-truth

Use this rule when multiple docs mention the same topic:

| Topic | Authoritative document |
|---|---|
| Product overview / packaging / install surface | `../README.md` |
| Runtime lifecycle and internal architecture | `architecture.md` |
| Built-in target philosophy and custom target adapters | `authoring-targets.md` |
| Codex minimum completion bar | `codex-target-minimum-completion-checklist.md` |
| Rule catalog reference | `rules-reference.md` |
| Future direction | `roadmap.md` |

Interpretation rule:
- `README` is the product entrypoint
- `architecture.md` is the technical architecture truth
- `authoring-targets.md` owns target semantics
- checklist docs refine a narrow topic; they do not replace the architecture or product entry docs
- leaf authoring docs explain how to extend a surface; they are not the main product narrative

## Read by role

### 1. Individual engineer
Use this path if you mainly want to install, use, or understand what the harness gives you.

Read in order:
1. `../README.md`
2. `architecture.md`
3. `authoring-targets.md`

### 2. Team lead / engineering manager
Use this path if you care about rollout, governance consistency, and why the package should exist inside a team.

Read in order:
1. `../README.md`
2. `architecture.md`
3. `rules-reference.md`
4. `roadmap.md`

### 3. Maintainer
Use this path if you will change installer behavior, manifests, lifecycle logic, or package structure.

Read in order:
1. `../README.md`
2. `architecture.md`
3. `authoring-targets.md`
4. `authoring-overlays.md`
5. leaf authoring docs as needed

### 4. Custom target author
Use this path if you want to add support for another AI coding tool.

Read in order:
1. `authoring-targets.md`
2. `architecture.md`
3. `authoring-overlays.md`

## Read by goal

| Goal | Read first | Then read |
|---|---|---|
| Understand what this package is | `../README.md` | `architecture.md` |
| Understand the system design | `architecture.md` | `authoring-targets.md` |
| Understand Claude vs Codex behavior | `authoring-targets.md` | `codex-target-minimum-completion-checklist.md` |
| Add or change a custom target | `authoring-targets.md` | `architecture.md` |
| Add rules / hooks / commands / skills | `authoring-rules.md`, `authoring-hooks.md`, `authoring-commands.md`, `authoring-skills.md` | `architecture.md` |
| Customize installs per team or repo | `authoring-overlays.md` | `authoring-targets.md` |
| Understand future direction | `roadmap.md` | `architecture.md` |
| Run the minimum pre-release operator gate | `../README.md` (`verify-release`) | `architecture.md` |

## Product model

Think of the package as three product layers:

1. **Adapters**
   - Claude, Codex, and custom targets define user homes, project instruction files, manifest names, and required files.
2. **Control plane**
   - `init`, `update`, `doctor`, `status`, `rollback`, and `ci` share one lifecycle model.
3. **Governance payload**
   - rules, skills, hooks, commands, and instruction templates are the actual content shipped to engineers.
4. **Explain / inspection surface**
   - `explain`, `status`, `diff`, and `restore` expose planning decisions, file provenance, and current lifecycle state.

## Internal architecture map

The current implementation is intentionally split into:

- **plan** → `src/lib/profile-plans.js`
- **runner** → `src/lib/profile-runner.js`
- **cleanup** → `src/lib/update-cleanup.js`
- **explain / inspection** → `src/lib/explain.js`, `src/commands/explain.js`

That means:
- commands should stay thin
- planning should decide *what to run*
- the runner should decide *how files are applied*
- cleanup should handle *update-only aftercare*

## Live docs in this directory

| File | Purpose |
|---|---|
| `architecture.md` | Main technical architecture and lifecycle explanation |
| `authoring-targets.md` | Built-in target philosophy and custom target adapters |
| `authoring-rules.md` | Rule authoring guide |
| `authoring-skills.md` | Skill authoring guide |
| `authoring-hooks.md` | Hook authoring guide |
| `authoring-commands.md` | Command authoring guide |
| `authoring-agents.md` | Agent authoring guide |
| `authoring-overlays.md` | Overlay customization guide |
| `codex-target-minimum-completion-checklist.md` | Codex completion definition and minimum governance bar |
| `roadmap.md` | Future product direction |
| `rules-reference.md` | Rule reference index |
| `prds/claude_code_setting_v0.6_*.md` | v0.6 Readiness / PRD / SDD / Closure Review decision chain |
| `releases/claude_code_setting_v0.6.0_release_note.md` | v0.6.0 external release communication artifact |
| `releases/claude_code_setting_v0.6.0_release_commit_scope.md` | v0.6.0 release commit scope decision |

## Reading rule

For product understanding, default order is:

1. `../README.md`
2. `architecture.md`
3. `authoring-targets.md`

Do not start from the leaf authoring docs unless you already know the package model.
If two docs seem to overlap, prefer the authoritative-doc table above instead of guessing.
