---
name: prompt-caching
description: Maximize cache hit rate on Claude API calls to cut latency and cost. Invoke when building or optimizing a production Claude-powered feature.
category: ai
tags: [claude, anthropic, caching, performance]
risk: medium
---

# Prompt caching (Claude API)

Claude's prompt caching reduces repeated-prefix cost by up to 90% and can cut latency significantly. It also has a **5-minute TTL** on the default cache tier — if you're not hitting within 5 minutes, the cache entry is gone. Design for this.

## When caching helps

Caching helps when:

- You make many requests with overlapping prefixes (system prompt, tools definitions, long documents).
- Requests are frequent enough to hit within the TTL.
- The cacheable content is ≥1024 tokens (Sonnet/Opus) or ≥2048 (Haiku) — smaller caches don't pay off.

Caching doesn't help when:

- Each request is one-shot with a totally unique prompt.
- The prompt content varies above the cache boundary.
- Traffic is too sparse to hit the TTL window.

## How it works (at a high level)

You mark the end of cacheable content with a `cache_control` breakpoint:

```python
messages = [
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "<long document or system instructions>",
        "cache_control": {"type": "ephemeral"}
      },
      {
        "type": "text",
        "text": "<the per-request query>"
      }
    ]
  }
]
```

Everything up to and including the marked block is cached. Anything after is the variable part.

On a cache hit, you pay a reduced rate for the cached tokens and normal rate for new tokens. On a miss, the first request incurs a cache-write cost (higher than normal), and subsequent requests within 5 minutes hit.

## Design rules

### 1. Order content by stability

Put the most stable content first, least stable last.

**Good:**

```
[stable system prompt]
[stable tool definitions]
[stable shared context]
<cache breakpoint>
[variable per-request query]
```

**Bad:**

```
[variable per-request query]
[stable system prompt]
<cache breakpoint>
```

The variable part at the top breaks the cache on every call.

### 2. Use up to 4 breakpoints

Claude supports multiple cache breakpoints. Use them to cache at multiple layers:

```
[org-wide system prompt]         <breakpoint 1: org level>
[user-specific context]           <breakpoint 2: user level>
[conversation history so far]     <breakpoint 3: conversation level>
[current turn]
```

Each breakpoint caches its own prefix. Org-level is shared across all users; user-level across a single user's sessions; conversation-level within a conversation.

### 3. Keep the cache warm

The 5-minute TTL is the main gotcha. If you're looping and waiting 10 minutes between calls, you're paying cache-write every time.

- **Active sessions:** re-ping every ~4 minutes to keep warm, if you know activity will continue.
- **Batch jobs:** bundle work to run close together rather than spread out.
- **Quiet periods:** accept the miss; don't artificially keep warm if there's no real traffic.

### 4. Measure

The API response reports `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`. Log them.

- **Hit rate** = `cache_read / (cache_read + cache_creation + uncached)`.
- **Target: >70%** for production workloads with repetitive prefixes.
- **If <30%**, your breakpoints are in the wrong place or your traffic is too sparse.

### 5. Beware of invalidation

Any change above a breakpoint invalidates the cache. Common accidental invalidations:

- Injecting a timestamp into the system prompt.
- Including request IDs or user IDs in the cacheable section.
- Localization: the cache is per-exact-content, so a translated system prompt caches per-locale (that's fine, just know).
- A/B testing different prompts: each variant has its own cache entry.

## Workflow tips

- **Static + dynamic split.** Architect prompts so the truly static part is separable from the per-request part. If you can't split them, you can't cache effectively.
- **Version the cache key.** When you change the cached prompt, the whole thing re-warms from the first call. Expect a cost spike on prompt deploys.
- **Cost model the change.** Run both cached and uncached versions on representative traffic and compare real usage, not theoretical savings.
- **Use the longest context window you can afford.** Caching makes long-context cheaper; a 100k-token prefix that's cached costs about 10% of uncached on hit.

## Anti-patterns

- **Marking a breakpoint after variable content.** Caches nothing useful.
- **Including a `Date().now()` in the system prompt.** Breaks cache on every call.
- **Not measuring hit rate.** You don't know if caching is helping.
- **Hoping a high-latency request flow will benefit from caching.** If you only call every 30 minutes, the cache is always cold. Caching won't help; you need a different optimization.
- **Treating cache misses as errors.** Misses are normal on the first request of each window.
