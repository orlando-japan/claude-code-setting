# 编写 Overlay

Overlay 允许团队在公司基线之上叠加额外文件，而无需 Fork 仓库。Overlay 目录中的文件在基础模板之后应用，因此它们可以添加新规则/技能，或替代特定团队的基础文件。

## 配置文件

在相关位置创建 `.company-cc.json`：

- **`~/.company-cc.json`** — 适用于用户 profile 安装（`init --user`）
- **`./.company-cc.json`** — 适用于项目 profile 安装（`init --project`）

```json
{
  "overlays": [
    "./team-templates",
    "@yourorg/harness-addons"
  ]
}
```

多个 overlay 按顺序应用。后面的 entry 在路径冲突时胜出。

## Overlay 目录结构

Overlay 目录镜像目标 home 目录。`overlay/rules/team-rule.md` 会安装到 `~/.claude/rules/team-rule.md`。

示例：

```
team-templates/
  rules/
    team-security.md
    team-api-style.md
  skills/
    deploy-workflow/
      SKILL.md
```

## Overlay 路径格式

| 格式 | 从哪里解析 |
|---|---|
| `"./relative/path"` | 配置文件目录 |
| `"../relative/path"` | 配置文件目录 |
| `"/absolute/path"` | 磁盘绝对路径 |
| `"@org/package"` | `node_modules` — 从配置文件往上查找 |
| `"package-name"` | `node_modules` — 从配置文件往上查找 |

如果路径不存在，harness 会警告并继续 —— 缺失的 overlay 不会使安装失败。

## 优先级

Overlay 文件在基础模板之后应用。在 overlay 内，数组中后面的 entry 胜出。

优先级顺序（从低到高）：`company baseline → overlays[0] → overlays[1] → ...`

一个未被本地修改的基础模板文件会被 overlay 版本覆盖。用户本地修改的文件始终会跳过（与基础模板行为一致）。

## Manifest 跟踪

Overlay 文件的 manifest 跟踪方式与基础模板文件相同。`source` 字段记录 overlay 目录路径，从而让 `diff` 和 `restore` 正常工作：

```
company-cc diff rules/team-security.md   # 与 overlay 源比对
company-cc restore rules/team-security.md  # 从 overlay 源恢复
```

## npm 包 Overlay

对于团队级分发，发布一个 npm overlay 包并全局安装或作为 dev 依赖：

```bash
npm i -g @yourorg/harness-addons
```

然后在 `.company-cc.json` 中引用它：

```json
{ "overlays": ["@yourorg/harness-addons"] }
```

包根目录就是 overlay 目录 —— 结构与本地 overlay 文件夹相同。

## 何时使用 overlay vs fork

当：
- 团队想在公司基线上添加额外规则或技能
- 不同团队需要不同的 settings 或 hooks
- 希望公司基线的更新自动流动

就使用 overlay。

当你：
- 想改变或删除基础模板文件（overlay 只能添加/替代，不能删除）
- 需要修改 CLI 行为本身

就应该 fork 仓库。
