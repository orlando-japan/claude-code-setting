---
name: doc-defrag-audit
description: Audit document fragmentation and identify the canonical mainline. Invoke when a repo has overlapping PRDs, READMEs, specs, patch docs, or legacy notes and you need to decide what is authoritative.
category: review
group: review
tags: [docs, governance, architecture, mainline]
risk: low
---

# Document defragmentation audit

Treat document structure as architecture, not housekeeping. When the entrypoint drifts or patch notes start competing with the mainline, teams lose the ability to answer a simple question: "which document is the source of truth?"

## What to audit first

1. **Mainline documents**
   - Active PRD / SDD / spec / README / navigation docs
   - Files that claim to be the entrypoint or current authority
2. **Patch and legacy artifacts**
   - `patch`, `delta`, `v2`, `legacy`, `old`, `archive`, `rereview`, `handoff`, `checklist` style documents
3. **Runtime and governance entrypoints**
   - README, whitelist, rules, skill docs, agent docs, onboarding notes
4. **Reference chain**
   - Does each supporting document explicitly say what it extends, supersedes, or no longer governs?

## Severity model

- **P0 — mainline authority conflict**
  - Two documents both appear to own the same decision space
  - A retired patch doc still looks active
- **P1 — inheritance / link drift**
  - The main document is right, but surrounding docs still reference old paths, old names, or old authority
- **P2 — directory pollution / readability debt**
  - The structure is technically survivable, but cluttered enough to slow down future work

## Audit workflow

1. **Find the primary entrypoint**
   - Identify the one file a new maintainer should read first
2. **Map the sibling docs**
   - Classify each as active mainline, supporting note, process artifact, legacy, or redirect candidate
3. **Check authority statements**
   - Every non-mainline doc should explicitly say one of:
     - extends
     - supersedes
     - historical only
     - operational checklist only
4. **Score the top 1-3 problems**
   - Do not dump every nit; surface the highest leverage conflicts first
5. **Recommend the smallest fix that restores order**
   - Prefer header clarification, redirect stubs, or navigation cleanup before aggressive file moves

## Preferred output

Use a compact audit note such as:

```text
P0: <authority conflict>
P1: <inheritance drift>
P2: <directory pollution>

Recommendation:
- <smallest fix>
- <next-smallest fix>
```

If the tree is clean, say so plainly.

## Anti-patterns

- **Treating every old document as equal** — history is not authority; mark retired docs explicitly.
- **Starting with mass file moves** — first restore legal clarity, then reorganize.
- **Listing 25 tiny issues** — prioritize the few conflicts that actually block trust.
- **Creating a new summary doc to explain the mess** — fix the main entrypoint instead of adding another sibling.
