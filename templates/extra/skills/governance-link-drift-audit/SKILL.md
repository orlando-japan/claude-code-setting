---
name: governance-link-drift-audit
description: Audit whether READMEs, whitelists, skills, rules, and runtime entrypoints still point to the current authoritative documents. Invoke after doc moves, renames, or governance rewrites.
category: review
group: review
tags: [docs, governance, links, drift]
risk: low
---

# Governance link drift audit

A repository can have the right canonical document and still fail operationally if every entrypoint keeps pointing somewhere old. This skill checks the reference chain around governance documents, runtime instructions, and onboarding entrypoints.

## When drift is present

Common symptoms:

- README points to a retired path
- skill docs still reference an old whitelist or patch index
- runtime instructions mention files that were moved or renamed
- governance docs were updated, but operational entrypoints were not

## Audit target set

Check these first:

1. README / navigation / whitelist documents
2. Agent instruction files (`AGENTS.md`, `CLAUDE.md`, similar)
3. Skills and rules that name authoritative docs explicitly
4. Operational checklists that still assume old locations

## Audit workflow

1. **Identify the current authority**
   - What is the active canonical doc or canonical doc set now?
2. **Trace all direct references**
   - Search for old filenames, retired paths, and old aliases
3. **Separate content drift from link drift**
   - If the content is wrong, that is a governance change
   - If the content is right but references are stale, that is link drift
4. **Classify impact**
   - **High:** runtime or onboarding path leads to wrong authority
   - **Medium:** supporting docs still reference retired material
   - **Low:** historical or low-traffic docs have stale links
5. **Default to audit-only unless explicitly told to edit**
   - The safest default is to report the stale edges first

## Preferred output

```text
Current authority:
- <file/path>

Drift findings:
- High: <stale runtime/onboarding link>
- Medium: <supporting doc drift>
- Low: <historical drift>

Recommended smallest fix:
- <patch the entrypoint>
- <patch the secondary references>
```

## Anti-patterns

- **Assuming moved docs are harmless if the main doc is correct** — users often enter through secondary paths.
- **Fixing links without checking authority first** — you can make drift more durable by wiring everything to the wrong file.
- **Auto-editing everything at once** — prioritize entrypoints, then supporting references.
