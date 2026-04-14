---
name: prompt-engineering
description: Write prompts that produce reliable LLM output. Invoke when designing or debugging a prompt in an LLM-powered feature.
category: ai
tags: [llm, prompts, claude, anthropic]
risk: medium
---

# Prompt engineering

Prompts aren't magic incantations. They're specs for a system that happens to read English. Clarity, constraints, and structure matter more than clever phrasing.

## The five-part frame

1. **Task** — what you want done, stated concretely.
2. **Context** — what the model needs to know that isn't in the task.
3. **Input** — the actual content to operate on (clearly demarcated).
4. **Format** — how you want the output structured.
5. **Examples** (optional but powerful) — zero, one, or few shots of input → output.

Most bad prompts skip one or more of these. Most good prompts are boring and explicit.

## Task

Be specific. "Summarize this" is vague. "Summarize this support ticket in 3 bullets, each ≤20 words, focusing on the customer's core problem and what they've tried" is specific.

Rule: if a human contractor couldn't deliver from your task description, the model can't either.

## Context

Everything the model needs that isn't in the task:

- The persona (who is the model being, for what audience).
- The domain (what jargon is okay, what assumptions it can make).
- Constraints the model doesn't know from task alone.
- What *not* to do (negative constraints are often as important as positive ones).

Don't pad with irrelevant context. Every extra token is noise, cost, and distraction.

## Input

Wrap the content in clear delimiters so the model knows where task ends and content begins:

```
<ticket>
{customer ticket text}
</ticket>
```

XML-style tags work well with Claude and are unambiguous. Use them.

## Format

Tell the model exactly what the output should look like:

- JSON with specific fields.
- A markdown table with specific columns.
- A numbered list with exactly N items.
- "Only the final answer, no preamble."

Models default to conversational output. If you want structured, say so.

## Examples

For non-trivial tasks, examples beat instructions:

```
Example 1:
Input: "I can't log in, it says my password is wrong"
Output: {"category": "auth", "severity": "medium", "next_step": "reset_password_flow"}

Example 2:
Input: "The app crashes when I open the orders page"
Output: {"category": "bug", "severity": "high", "next_step": "escalate_engineering"}

Now classify:
{new input}
```

A handful of good examples teaches the format and the edge cases better than three paragraphs of instructions.

## Reliable output rules

- **Ask for reasoning before conclusion** if the task is complex. "Think step by step, then give a final answer." Claude has extended thinking — use it for hard reasoning.
- **Constrain the output shape.** JSON with named fields. Don't parse free-form prose.
- **Handle the model's failure modes:** what if the input is malformed? What if the model isn't sure? Specify the escape hatch ("return `null` if you can't determine").
- **Temperature matters.** Low (0–0.3) for deterministic tasks (extraction, classification). Higher (0.5+) for creative tasks.

## Common failure modes

### The model is making stuff up

- You're asking it to recall facts it doesn't know. Give it the facts as context, don't trust its memory.
- Your input is ambiguous and it's filling gaps. Tighten the input.

### The model is ignoring instructions

- The instructions are buried in a long prompt. Move critical instructions to the top and bottom (primacy + recency effects).
- Conflicting instructions. Audit for contradictions.
- You're using "don't do X" when "do Y" would be clearer.

### The model is too conservative / too aggressive

- Adjust the persona ("you are a careful legal reviewer" vs "you are a creative brainstormer").
- Lower temperature for conservative, raise for creative.
- Add examples of the desired tone.

### The output format is wrong

- Use XML tags or JSON schemas in the prompt.
- Show examples.
- Use tool use / structured output features when available instead of parsing prose.

## Prompt evaluation

For anything production:

- **Build an eval set.** 20–100 representative inputs with expected outputs.
- **Run each prompt iteration against the eval set** and track the pass rate.
- **Never ship a prompt change based on "it looked right in one example."** The edge cases are where things break.

## Anti-patterns

- **Magic words.** "You are an expert world-class AI that never makes mistakes." Doesn't help. Real instructions help.
- **Please and thank you.** Fine for taste; makes no measurable difference.
- **Over-specifying.** A 2000-token prompt for a simple task buries the important parts.
- **Under-specifying.** A 20-token prompt for a nuanced task gets inconsistent outputs.
- **Not testing on edge cases.** Adversarial inputs, empty inputs, very long inputs, multilingual inputs.
- **Locking the prompt with no re-evaluation after model upgrades.** A new model version is a new contract. Re-run evals.
