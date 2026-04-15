# Authoring skills

A **skill** is a Markdown playbook for a specific kind of work — "review a PR", "design an API", "debug a flaky test". Skills are NOT loaded by default; the active coding tool reads them on demand when the description matches what the user is asking about. That makes them cheap to add and the right place for any reusable, longer-form expertise.

## File layout

```
templates/shared/skills/<kebab-name>/SKILL.md   <-- core skill (always installed)
templates/extra/skills/<kebab-name>/SKILL.md    <-- opt-in (only with --extras)
```

One directory per skill. The directory name is the canonical id. The directory may contain auxiliary files (templates, checklists, scripts) referenced from `SKILL.md`.

## Frontmatter

Every `SKILL.md` starts with YAML frontmatter:

```markdown
---
name: <kebab-name>                    # must match directory name
description: <one sentence>. Invoke when <trigger>.
category: <coding|review|architecture|security|workflow|ai|ops|frontend|delivery>
tags: [<short>, <tag>, <list>]
risk: low | medium | high
---
```

The **description** is the single most important field. The tool matches user intent against descriptions to decide which skill to load. Bad descriptions = skill never gets used.

- ✅ "Reduce p99 latency on API endpoints. Invoke when an endpoint is slow or a latency alert fires."
- ❌ "Performance helper."

Lead with the outcome and finish with the trigger ("Invoke when …"). One sentence each.

## Body structure

Most skills follow:

```markdown
# <Skill title>

<2-3 sentence framing — what's the underlying idea>

## <Section: a concept the skill teaches>

<Short, opinionated guidance>

## <Section: a process / checklist>

<Numbered or bulleted steps>

## Anti-patterns

- <Common mistake> — <why it's wrong, what to do instead>
```

Keep skills under ~150 lines. If a skill is longer, it's probably two skills.

## Style rules

- **Opinionated, not encyclopedic.** A skill picks a stance. "Use X because Y" beats "X has these pros and Z has these pros."
- **Specific, not generic.** "Aim for `< 200ms INP`" beats "make it fast."
- **Cite the trigger.** Anti-patterns end with what to do instead, not just what's wrong.
- **No code dumps.** Skills are guidance. If you need a full implementation, make it a separate file in the skill directory and reference it.
- **Don't reference the rest of the harness by file path.** "See rules/security.md" rots; "follow our security rules" is fine.

## Adding a skill

1. Pick `core` (`templates/shared/skills/`) or `extra` (`templates/extra/skills/`).
   - Core: relevant to ~all engineers. Defaults installed.
   - Extra: domain-specific (e.g. infra-as-code, frontend-performance). Only installed with `--extras`.
2. Create `<kebab-name>/SKILL.md` with frontmatter and body.
3. Verify with `node src/cli.js init --user --extras --dry-run` (or with an isolated `HOME=`).
4. Open a PR; reviewers should sanity-check the description and confirm the skill is meaningfully different from existing ones.

## Reviewing a skill PR

- **Description quality** — would the active coding tool know to load this from a real user prompt?
- **Overlap** — is this already covered by an existing skill? If so, extend that one instead.
- **Risk classification** — anything that mutates infra, data, or auth should be `risk: high`.
- **Length** — over ~150 lines is a smell; split or trim.
- **Anti-patterns section** — usually the most useful part. Don't merge without one.

## Renaming or removing a skill

- Renames are breaking: users on older installs will keep the old directory until they `update --force`. Prefer adding a new skill and deprecating the old one with a `description: "(deprecated, see X)"` for one release.
- Removals: delete the directory in the template, ship a release; users get cleanup on next `update`. Add a CHANGELOG note.
