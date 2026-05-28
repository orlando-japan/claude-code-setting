# 编写 Skill

**Skill** 是针对特定工作类型的 Markdown playbook，例如“审查 PR”、“设计 API”、“调试不稳定测试”。Skill 不会默认加载；当用户的意图与描述匹配时，当前编码工具会按需读取它们。这使它们容易添加，也适合作为任何可复用的、较长形式的专业知识。

## 文件布局

```
templates/shared/skills/<kebab-name>/SKILL.md   <-- 核心 skill（始终安装）
templates/extra/skills/<kebab-name>/SKILL.md    <-- 按需安装（仅在 --extras 时）
```

每个 skill 一个目录。目录名是规范 id。目录可以包含辅助文件（模板、清单、脚本），在 `SKILL.md` 中引用。

## Frontmatter

每个 `SKILL.md` 都以 YAML frontmatter 开头：

```markdown
---
name: <kebab-name>                    # 必须与目录名一致
description: <one sentence>. Invoke when <trigger>.
category: <coding|review|architecture|security|workflow|ai|ops|frontend|delivery>
tags: [<short>, <tag>, <list>]
risk: low | medium | high
---
```

**description** 是最重要的字段。工具会根据描述匹配用户意图以决定加载哪个 skill。描述不好 = skill 永远不会被使用。

- ✅ “Reduce p99 latency on API endpoints. Invoke when an endpoint is slow or a latency alert fires.”
- ❌ “Performance helper.”

先写结果，再写触发条件（"Invoke when …"）。每个字段保持一句话。

## 正文结构

大多数 skill 遵循：

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

保持 skill 在约 150 行以内。如果更长，通常应该拆成两个 skill。

## 风格规则

- **要有立场，不要百科全书式。** Skill 应该表达观点。“因为 Y 使用 X”优于“X 有这些优点，Z 有这些优点”。
- **具体，不要泛泛而谈。** “目标是 `< 200ms INP`”优于“让它更快”。
- **引用触发条件。** 反模式应以“应该怎么做”收尾，而不是仅说明错误。
- **不要代码 dump。** Skill 是指导性内容。如果需要完整实现，可另建文件并引用它。
- **不要引用 harness 的文件路径。** “参见 rules/security.md”会失效；“遵循我们的安全规则”则可以。

## 添加 Skill

1. 选择 `core`（`templates/shared/skills/`）或 `extra`（`templates/extra/skills/`）。
   - Core：对大多数工程师都相关，默认安装。
   - Extra：领域特定（例如 infra-as-code、前端性能）。仅在 `--extras` 时安装。
2. 创建 `<kebab-name>/SKILL.md`，包含 frontmatter 和正文。
3. 运行 `node src/cli.js init --user --extras --dry-run` 验证（或在隔离的 `HOME=` 下验证）。
4. 提交 PR；审查人员应检查描述是否合理，并确认 skill 与现有内容有实际差异。

## 审查 Skill PR

- **描述质量** — 活动编码工具是否能从真实用户提示识别并加载这个 skill？
- **重叠** — 是否已被现有 skill 覆盖？如果是，应扩展现有 skill 而不是新建。
- **风险分类** — 任何修改基础设施、数据或认证的内容都应为 `risk: high`。
- **长度** — 超过 ~150 行通常是异味；拆分或裁剪。
- **反模式部分** — 往往最有价值。没有这一节不要合并。

## 重命名或移除 Skill

- 重命名是破坏性变更：旧安装会保留旧目录，直到用户执行 `update --force`。
- 首选做法是在一个版本中添加新 skill，并用 `description: "(deprecated, see X)"` 弃用旧 skill。
- 移除时：删除模板目录、发布新版本；用户下一次 `update` 会清理旧文件。记得在 CHANGELOG 中说明。
