---
name: evals-design
description: Build an offline evaluation set so you can compare LLM prompts and models quantitatively. Invoke when building or iterating on any LLM-powered feature.
category: ai
group: dx
tags: [evals, llm, claude, testing]
risk: medium
---

# Evals design

Prompt engineering without evaluation is guessing. Evals are how you know if a prompt change made the output better, worse, or different-but-neither.

## The core idea

An eval is a fixed set of `(input, expected_output_or_grader)` pairs that you run every prompt/model version against. You compare aggregate scores across versions.

```
prompt_v2 scores 0.87 on the eval set vs prompt_v1 at 0.81 → ship v2
prompt_v3 scores 0.79 → don't ship v3
```

Without this, you're going on vibes.

## Three types of graders

### 1. Exact match / structured

For tasks with a right answer: classification, extraction, routing.

- Input: "I can't log in, password reset isn't working"
- Expected: `{"category": "auth", "severity": "medium"}`
- Grader: exact match on the JSON.

Fast, cheap, deterministic. Use wherever possible.

### 2. Rule-based / programmatic

For tasks with constraints that are testable programmatically.

- Length constraint: "summary ≤ 200 words"
- Format constraint: "output is valid JSON"
- Content constraint: "output contains one of these keywords"
- Safety: "output does not contain PII"

Fast, cheap, composable with exact match.

### 3. LLM-as-judge

For tasks where "correctness" is subjective: summaries, explanations, creative output, rewrites.

A second LLM call evaluates the output against a rubric:

```
You are grading a summary. Given the original text and the summary,
rate 1-5 on:
- Faithfulness: does it accurately reflect the original?
- Completeness: does it cover the key points?
- Concision: is it free of filler?
Output JSON: {"faithfulness": N, "completeness": N, "concision": N}
```

**Caveats:**

- LLM graders are biased. They prefer verbose output, their own outputs, and outputs that match their training distribution.
- Use a *different* model for grading than for generating when possible.
- Validate the grader against human labels on a subset. If the grader doesn't correlate with human judgment, it's useless.
- Grading is non-deterministic. Run multiple samples.

## Building the eval set

1. **Start with real examples.** User queries from production, historical bug reports, adversarial inputs.
2. **Include edge cases.** Empty input, very long input, multilingual, obviously wrong requests, ambiguous phrasing.
3. **Include categories.** Ensure coverage of each kind of task the system is supposed to handle.
4. **Label carefully.** If the expected output is labeled wrong, the eval is a lie. Review labels with a second human.
5. **Size: 50–500 examples** for most tasks. Smaller = noisy; larger = slow and expensive to run.

## Running evals

- **Track scores over time.** A dashboard showing score per prompt version.
- **Break down by category.** A prompt change might improve the average while regressing on a specific category.
- **Watch for cost and latency regressions** — a prompt that scores 0.89 but costs 3x might not be worth it.
- **Run on every prompt change** before deploying to production.
- **Run on model upgrades.** A new model version is a new system. Re-evaluate.

## Anti-patterns

- **Evaluating on a handful of hand-picked examples.** You will pick examples where your favorite version wins.
- **Using the same examples you designed the prompt on.** You overfit. Use a held-out eval set.
- **Eval set that never changes.** Reality drifts. Refresh with new examples quarterly.
- **Ignoring the cases where the eval score went up but users complained.** The eval missed a dimension. Expand it.
- **Graders that agree with the generator.** Biased evaluation. Use different models or humans.
- **No ground truth.** You can't evaluate what you can't define.
- **One score to rule them all.** Most tasks have multiple dimensions. Track them separately.

## When you can't build an eval

For some tasks, no automatic grader is good enough: creative writing, complex reasoning, aesthetic judgment. Options:

- **Human eval** — expensive but gold standard. Pay attention to inter-rater agreement; if humans disagree, your task definition is fuzzy.
- **Pairwise comparison** — easier than absolute rating. "Which of these two outputs is better?" Humans are more consistent on pairwise than absolute.
- **Smaller proxy metrics** — if you can't grade the full output, grade parts of it (faithfulness, safety, format).

When none works, the feature is hard to improve systematically. Budget accordingly.
