# 编写 Agent

Agent 存放在 `templates/claude-user/agents/*.md`，并在 `init` 时复制到 `~/.claude/agents/`。Claude Code 将它们作为独立子 agent 启动 —— 它们没有会话上下文，并使用自己的工具范围和模型设置。

## 什么时候该添加 Agent、Command、还是 Skill

| | Agent | Command | Skill |
|---|---|---|---|
| 上下文 | 无 — 冷启动 | 完整会话上下文 | 按需加载模型 |
| 隔离性 | 是 — 独立执行 | 否 | 否 |
| 适用场景 | 独立审查、并行研究、不应读取主会话历史的任务 | 用户显式触发的交互式工作流 | 可复用的 playbook，由模型自动加载 |
| 可并行 | 是 | 否 | 否 |

当你需要一个独立视角（代码审查、安全审计），或希望保护主会话不被大规模、嘈杂的结果污染时，就添加 Agent。

## Frontmatter

```markdown
---
name: <kebab-name>
description: <一句话描述>. Use when <trigger>. [Use proactively when <condition>.]
tools: Read, Grep, Glob, Bash(git diff:*), ...
model: opus | sonnet | haiku
---
```

`name` 必须与文件名（不含 `.md`）一致。

`description` 决定 orchestrator 何时生成这个 agent。写法应为：*它做什么* + *什么时候使用* + 可选 *什么时候主动使用*。描述不佳会导致 agent 永远不被调用。

- ✅ `"Independent code reviewer. Use proactively after any non-trivial set of code changes, or when the user asks for a review or second opinion."`
- ❌ `"Reviews code."`

`model` 是必需的。审查与推理类工作默认用 `opus`，执行密集任务用 `sonnet`。不要把 `haiku` 用在判断密集型工作上。

`tools` 限制 agent 可使用的工具。范围越窄越安全 —— 不需要写权限的 agent 不要带 Write。

## 正文

正文是子 agent 的 system prompt。写成持续指令，而不是一次性简报：

```markdown
---
name: example-reviewer
description: ...
tools: Read, Grep, Glob
model: opus
---

You are a <role>. Your job is to <goal>.

**Principles:**

- <short, opinionated stance>
- <short, opinionated stance>

**Output format:**

<clear structure — headings, severity labels, verdict line>

**What not to do:**

- <failure mode you've seen>
- <failure mode you've seen>
```

规则：
- 以角色和目标开头。agent 启动时没有上下文。
- 要有明确立场：“发现真实问题”优于“查找潜在问题”。
- 输出格式很重要 —— 不清晰格式会导致冗长、难读的结果。
- 控制在 ~60 行以内。过长的系统 prompt 会稀释焦点。

## 添加 Agent

1. 创建 `templates/claude-user/agents/<kebab-name>.md`。
2. 验证安装：`HOME="$(mktemp -d)" node src/cli.js init --user`，然后检查 `~/.claude/agents/`。
3. 提交 PR 时升级版本（Agent 是面向用户的；视为次版本升级）。

## 审查 Agent PR

- **描述质量** — orchestrator 是否能从真实用户请求中知道何时触发？
- **工具范围** — 是否最小化？仅授予所需工作流。
- **模型选择** — `opus` 是否合理，还是 `sonnet` 更合适？
- **独立性** — 正文是否假设 agent 有它没有的会话上下文？
- **重复性** — 是否与现有 Agent 重复？应扩展而不是并行。

## 移除或重命名 Agent

与命令相同：弃用一个版本，然后再删除。重命名是破坏性变更，因为已经自定义的用户文件会保留旧文件。
