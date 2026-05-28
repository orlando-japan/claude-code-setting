# 编写 Slash Command

Slash 命令存放在 `templates/claude-user/commands/*.md`，并在 `init` 时复制到 `~/.claude/commands/`。它们在 Claude Code 中当用户输入 `/` 时出现，并在活动会话中直接执行 —— 不需要单独启动子 agent。

## 什么时候该添加 Command、还是 Skill

| | Command | Skill |
|---|---|---|
| 触发 | 用户输入 `/name` | 模型根据描述自动加载 |
| 上下文 | 完整会话上下文 | 限制性上下文 |
| 适用场景 | 需要显式调用并传参的交互式工作流 | 应由模型根据任务自动激活的可复用流程 |
| 参数支持 | `$ARGUMENTS` | n/a |

当用户需要显式触发工作流并传入参数时，添加 Command；当工作流应自动激活时，添加 Skill。

## Frontmatter

每个命令文件以 YAML frontmatter 开头：

```markdown
---
description: <在 / 选择器中显示的一句话>
argument-hint: [可选，显示在命令名后]
allowed-tools: Read, Grep, Glob, Bash(git diff:*), ...
---
```

`allowed-tools` 限制命令可调用的工具。只列出工作流实际使用的工具 — 范围越窄越安全。

`argument-hint` 可选。当命令接受有意义用户输入时展示，例如 `[file path | "staged" | PR number]`。

## 正文

正文是用户运行命令时注入的 prompt。把它写成对同事的简报：

```markdown
---
description: Do X from the current working state
allowed-tools: Bash(git status:*), Bash(git diff:*), Read
---

Do X using **$ARGUMENTS** as the target.

**Step 1 — inspect:**
<what to read first>

**Step 2 — act:**
<what to do>

**Do NOT:**
- <sharp constraint>
- <sharp constraint>
```

规则：
- 使用 `$ARGUMENTS` 在需要拼接用户输入的位置。
- 先写目标，步骤随后。
- 以明确 **Do NOT** 项结束，说明失败模式。
- 控制在 ~40 行以内。如果更长，通常应该做成 Skill。

## 添加 Command

1. 创建 `templates/claude-user/commands/<kebab-name>.md`。
2. 验证安装：`HOME="$(mktemp -d)" node src/cli.js init --user`，然后检查 `~/.claude/commands/`。
3. 将其添加到 `README.md` 中的 command 表格（“How to use the harness” 部分）。
4. 升级包版本（Command 面向用户；视为次版本升级）。

## 审查 Command PR

- 描述是否符合用户会在 `/` 搜索时的预期？
- `allowed-tools` 是否最小化？是否仅授予所需权限？
- `$ARGUMENTS` 是否用于用户输入流？是否存在敏感拼接问题？
- 是否重复现有命令？应扩展而不是平行动作。
- 正文是否在 ~40 行以内？如果不是，是否应该改成 Skill？

## 重命名或移除 Command

重命名属于破坏性变更：旧安装仍会保留旧文件，直到用户执行 `update --force`。首选路径：
1. 添加新名称。
2. 在一个版本内将旧命令标记为弃用：`description: "(deprecated — use /new-name)"`。
3. 在下一版本中删除旧命令，并在变更日志中注明。
