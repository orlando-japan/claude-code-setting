---
name: dependency-review
description: Evaluate a new dependency before adding it. Invoke when anyone proposes `npm install`, `pip install`, `cargo add`, or `go get` for a new package.
category: security
group: review
tags: [dependencies, supply-chain, license]
risk: high
---

# Dependency review

The cheapest line of code is the one you don't add. The cheapest dependency is the one you don't pull.

## First, question whether you need it

Before evaluating a package, ask:

- **Can I write this in <50 lines?** Date formatting, debouncing, UUID generation, slugify — usually yes.
- **Is this already available in the stdlib?** Every language has surprising breadth in its standard library.
- **Is there already a similar dep in this project?** Don't add a second date library.
- **Is this the transitive problem of another dep?** Check before adding.

If yes to any: don't add.

## If you must add, check these seven things

### 1. Maintenance

- Last commit: <6 months is healthy, >2 years is suspicious.
- Open issues: triaged? Responded to? Or are maintainers gone?
- Release cadence: predictable or "one release 3 years ago"?
- Bus factor: solo maintainer with 20 other projects = fragile.

### 2. Popularity

- Weekly downloads: sanity check, not approval. Low downloads + specific-niche = fine. Low downloads + generic utility = concerning (why is nobody using it?).
- GitHub stars: weak signal, but a drop-off from a formerly popular package is a red flag.

### 3. License

- **Permissive** (MIT, BSD, Apache 2) → generally fine.
- **Copyleft** (GPL, AGPL) → check with legal. AGPL on server code is the big one.
- **Unlicensed / "public domain" without SPDX** → treat as "do not use."
- **Custom licenses** → read the license. No exceptions.

### 4. Security history

- CVE database search on the package name.
- `npm audit` / `pip-audit` / `cargo audit` on the transitive tree.
- Track record: one CVE is normal; repeated RCEs or auth bypasses = pattern.
- Does the maintainer respond to security reports?

### 5. Transitive weight

- `npm list <pkg>` / equivalent to see what it pulls in.
- 5 transitive deps is fine. 500 is supply chain attack surface.
- Any of the transitives look sketchy? The risk compounds.

### 6. Install scripts

- `postinstall` scripts are the most common supply-chain attack vector.
- Check `package.json` `scripts.postinstall` and `scripts.preinstall` for this package and its transitive tree.
- If you can't audit the install script, don't install.

### 7. Name typo-squat check

- Is this the *actual* package you meant? `lodash` vs `lodahs` vs `lodas`.
- Check the author / org. Official packages usually come from official orgs.
- Cross-reference against a known list or the project's own docs.

## Output

A short paragraph or bullet list before installing:

```
Adding: <package@version>
Purpose: <one line>
Checks:
  - Maintenance: last commit 3 months ago, active issues ✓
  - License: MIT ✓
  - CVEs: 1 historical, patched, unrelated to our usage ✓
  - Transitive: pulls 2 extra (both well-known) ✓
  - Install scripts: none ✓
  - Name: matches official repo ✓
Alternatives considered: <name>, rejected because <reason>
```

## Anti-patterns

- **"It's popular so it's safe."** `event-stream` was popular.
- **Installing without reading transitive deps.** A locked-down top-level dep with a rogue transitive is still compromise.
- **Skipping license review.** License issues are the kind of problem you find 3 years later during acquisition.
- **Copy-pasting install commands from blog posts.** Always cross-check the package name.
