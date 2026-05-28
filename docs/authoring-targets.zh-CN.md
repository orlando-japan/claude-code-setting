# 编写自定义目标适配器

该 harness 默认内置两个目标：`claude`（Claude Code）和 `codex`（OpenAI Codex）。自定义目标适配器允许你在不修改核心包的情况下，扩展到其他 AI 编码工具 —— 例如 Cursor、Aider、Gemini CLI 等。

导航提示：
- 产品入口：`../README.md`
- 文档首页：`README.md`
- 技术架构真源：`architecture.md`

本文档是目标语义的**权威源**。

## 内置目标哲学

harness 提供两个内置目标：
- `claude` → 较丰富的目标，包含 Claude 专用用户资产，如 settings、commands、hooks、agents
- `codex` → 轻量目标，以 `AGENTS.md` 为中心，外加共享规则

重要设计规则：

> 目标是 **治理一致性，而不是文件树一致性**。

这意味着 Claude 和 Codex 应该共享相同的核心规则和生命周期（`init` / `update` / `doctor` / `ci` / `rollback`），同时保留目标特定的入口文件和运行时假设。

当前实现中，目标适配器为共享控制平面提供输入：
- **plan** 决定哪些目标/配置组合应运行
- **runner** 应用模板文件并最终生成 manifest
- **cleanup** 处理仅更新时的善后，例如过期技能清理

因此，编写新目标时，应把它看作为共享生命周期提供目标特定输入，而不是创建一个独立安装器。

对于 Codex，最低门槛是：
- 用户 profile 安装了共享规则 + `AGENTS.md`
- 项目 `AGENTS.md` 存在且已定制
- `doctor` / `ci` 能检查最少必需项目章节

目标不是克隆 Claude 更丰富的运行时资产到 Codex，除非 Codex 有真实消费机制。

## 工作原理

harness 会读取安装目录中的 `.company-cc.json`：
- `~/.company-cc.json` 用于用户 profile 安装
- `./.company-cc.json` 用于项目 profile 安装

任何其中的 `targets` 键都会注册为自定义目标，并可在所有 `company-cc` 命令中通过 `--target <name>` 使用。

## 配置格式

```json
{
  "targets": {
    "cursor": {
      "displayName": "Cursor",
      "userDest": "~/.cursor",
      "userManifestName": ".company-cc-cursor-manifest.json",
      "projectManifestName": ".company-cc-cursor-manifest.json",
      "userSrcs": ["./cursor-templates/shared", "./cursor-templates/user"],
      "projectSrcs": ["./cursor-templates/project"],
      "instructionFile": ".cursorrules",
      "requiredUserFiles": [".cursorrules"],
      "requiredProjectSections": [
        { "prefix": "## 1.", "label": "What this project is" },
        { "prefix": "## 2.", "label": "How to run and verify" }
      ]
    }
  }
}
```

### 字段说明

| 字段 | 是否必需 | 默认值 | 说明 |
|---|---|---|---|
| `displayName` | 否 | 目标名 | 在日志输出中的可读标签 |
| `userDest` | 否 | `~/.<name>` | 目标 home 目录的绝对路径。支持 `~` 展开。 |
| `userManifestName` | 否 | `.company-cc-<name>-manifest.json` | 用户安装的 manifest 文件名 |
| `projectManifestName` | 否 | `.company-cc-<name>-manifest.json` | 项目安装的 manifest 文件名 |
| `userSrcs` | 是 | — | 用户 profile 文件的模板目录列表。路径相对于配置文件目录，或绝对路径。 |
| `projectSrcs` | 是 | — | 项目 profile 文件的模板目录列表。 |
| `instructionFile` | 否 | `AGENTS.md` | 项目说明文件名（由 `doctor` 和 `ci` 使用） |
| `requiredUserFiles` | 否 | `[]` | `doctor` 会将其视为缺失致命的路径列表 |
| `requiredProjectSections` | 条件必需 | `[]` | `projectSrcs` 非空时必需。用于 `doctor`/`ci` 检查定制后的项目说明文件是否满足结构契约，支持字符串或 `{ prefix, label }` 对象。 |

## 最低治理契约

如果自定义目标声明了 `projectSrcs`，它必须同时声明 `requiredProjectSections`。

这是项目目标的最低治理契约：
- harness 能安装目标的项目说明文件
- `doctor` 能在关键章节缺失时发出警告
- `ci` 能在定制后的项目文件结构不完整时失败

没有这个契约，自定义目标只是“可安装”，而不是“可治理”。CLI 会拒绝这样的配置。

## 模板目录结构

模板源目录（`userSrcs`、`projectSrcs`）采用与内置模板相同的扁平结构 —— 文件相对于目标 home 目录：

```
cursor-templates/
  user/
    .cursorrules              → ~/.cursor/.cursorrules
    rules/
      coding-principles.md   → ~/.cursor/rules/coding-principles.md
  project/
    .cursorrules              → ./.cursorrules
```

## 使用自定义目标

配置 `.company-cc.json` 后：

```bash
company-cc init --target cursor
company-cc update --target cursor
company-cc status --target cursor
company-cc doctor --target cursor
company-cc ci --target cursor
```

## npm 包适配器

对于团队分发，可以发布一个 npm 包，在其 `package.json` 中嵌入目标定义：

```json
{
  "name": "@yourorg/cursor-harness",
  "company-cc": {
    "targets": {
      "cursor": {
        "displayName": "Cursor",
        "userDest": "~/.cursor",
        "userSrcs": ["templates/user"],
        "projectSrcs": ["templates/project"],
        "instructionFile": ".cursorrules",
        "requiredProjectSections": [
          { "prefix": "## 1.", "label": "What this project is" },
          { "prefix": "## 2.", "label": "How to run and verify" }
        ]
      }
    }
  }
}
```

harness 会将包内路径相对于包根解析。然后告诉用户安装适配器并引用它：

```json
{
  "adapterPackages": ["@yourorg/cursor-harness"]
}
```

```bash
npm i -g @yourorg/cursor-harness
company-cc init --target cursor
```

## 扩展 vs fork

当你需要支持一个额外 AI 工具并保持公司基线时，使用自定义适配器。若需要修改内置 Claude 或 Codex 行为，或改动 CLI 本身，则应 fork 仓库。

自定义适配器与内置目标彼此独立 —— 每个目标使用独立 manifest 文件，因此用户可以同时安装多个目标而不会发生 manifest 冲突。
