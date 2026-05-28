# 编写规则

共享规则存放在 `templates/shared/rules/*.md`，由 Claude 和 Codex 目标共同使用。在 Claude 配置中，它们通过 `templates/claude-user/CLAUDE.md` 中的 `@rules/<name>.md` 行导入，因此它们成为始终加载的上下文的一部分，应保持选择性。

## 何时添加规则

只有在以下三项都成立时才添加规则：

1. **它适用范围广。** 仅在某个特定文件或功能上触发的规则应写成该文件中的注释或一个 Skill。
2. **它改变行为，而不是知识。** 参考型材料应放在 Skill 或文档中。规则是命令式的：“始终 X”、“绝不 Y”、“优先 Z”。
3. **模型在没有该规则时会犯错。** 如果默认行为已经正确，就不要重复说明。

## 何时不添加规则

- 项目特定事实（文件路径、服务名称、工单跟踪器）→ 应放在项目 `CLAUDE.md`，而不是全局规则。
- 冗长解释或示例 → 应放在 Skill 中并引用它。
- 已由 hooks/permissions 检查的内容（例如“不要 `rm -rf /`”）→ hook 是执行手段，规则则是冗余。

## 格式

```markdown
# <topic>

<one-paragraph rationale: why this rule exists>

## Rules

- **Always** <imperative>. <one-line reason>.
- **Never** <imperative>. <one-line reason>.
- **Prefer** <X> over <Y>. <one-line reason>.

## When to break the rule

<short list of explicit exceptions, or "never">
```

每个文件保持在约 80 行以内。如果更长，它很可能应该做成一个 Skill。

## 命名和注册

1. 创建 `templates/shared/rules/<kebab-name>.md`。
2. 将 `@rules/<kebab-name>.md` 添加到 `templates/claude-user/CLAUDE.md` 的导入块中。
3. 本地运行 `company-cc init --user --force` 验证它是否加载。
4. 升级包版本（规则面向用户；视为次版本升级）。

## 审查规则 PR

- 这是否与现有规则冲突？合并前先解决。
- 它是否触发得太频繁 / 从不触发？如果你无法想到最近一个会话中它会有帮助，就先保留。
- 表述是否命令式且明确？“尝试使用 X”不是规则。
- 它是否让 `CLAUDE.md` 超过 200 行预算？如果是，将相关规则折叠在一起。
