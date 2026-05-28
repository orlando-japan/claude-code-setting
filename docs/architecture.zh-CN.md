# 架构

`@company/claude-code-setting` 是一个 npm 包，用于将一个经过策划的 AI 编码 harness 安装到工程师的机器上。它不在 Claude Code 或 Codex 中运行；它将模板文件复制到目标 home 和项目根目录，写入 manifest，然后退出。

导航提示：
- 产品入口：`../README.md`
- 文档首页：`README.md`
- 目标语义权威：`authoring-targets.md`

本文档是生命周期和内部执行流的**技术架构源头**。

## 心智模型

把这个包看作 AI 编码环境的小型控制平面：

- **目标适配层** → Claude / Codex / 自定义目标定义文件去向和入口文件
- **执行层** → 模板文件以安全覆盖语义复制，并进行 manifest 跟踪
- **治理载荷层** → 规则、技能、hooks、命令和说明文件成为已安装的表面

对于维护者而言，当前实现刻意拆成：

1. **计划**
   - `src/lib/profile-plans.js`
   - 决定 `init` 和 `update` 应该运行哪些目标/配置组合
2. **执行**
   - `src/lib/profile-runner.js`
   - 应用模板源、跟踪计数，并最终生成 manifest 元数据
3. **清理**
   - `src/lib/update-cleanup.js`
   - 处理仅更新时的后处理，例如当 extras 选择收窄时删除过期技能

这种拆分让命令编排更轻，并使计划、应用和清理独立可测。

## 目标模型

仓库在共享和供应商特定模板根之间拆分：

```text
templates/shared/          共享规则
templates/extra/           44 个按需 opt-in 技能，分 6 组（core、review、workflow、design、ops、dx）
templates/claude-user/     Claude 专用用户资产
templates/claude-project/  Claude 专用项目文件
templates/codex-user/      Codex 专用用户资产
templates/codex-project/   Codex 专用项目文件
```

目前安装器支持的目标：

```text
Claude user:   ~/.claude/
Claude project: <repo>/CLAUDE.md

Codex user:    $CODEX_HOME or ~/.codex/
Codex project: <repo>/AGENTS.md
```

共享资产（例如 `rules/`）会安装到两个用户 home。供应商特定文件保持隔离。技能仅在 `--extras` 请求时按需安装。

## Manifests

每个目标都保留自己的 manifest，因此 Claude 和 Codex 安装可以共存：

```text
~/.claude/.company-cc-manifest.json
~/.codex/.company-cc-codex-manifest.json
<repo>/.company-cc-manifest.json
<repo>/.company-cc-codex-manifest.json
```

`update` 会发现所选目标集存在的 manifest。

`doctor` 故意区分状态：
- **fatal**：manifest 存在但所需安装状态损坏
- **not initialized**：目标 home 存在但 harness 从未安装
- **optional missing**：OpenSpec 等集成缺失，但 harness 本身健康

## 分层

共享 / 供应商拆分是有意设计：

| 层 | 目的 |
|---|---|
| 共享规则 | 始终相关的工程默认（总是安装） |
| Claude 适配器 | `CLAUDE.md`、commands、agents、hooks、settings、MCP stub，以及项目级文档治理工作流 |
| Codex 适配器 | `AGENTS.md` 用户/项目入口文件 |
| 额外技能 | 44 个按需可选 playbook，按组或技能名安装；用 `skills list/remove` 管理 |

这让大部分指导可移植，同时让每个工具保留自己的表面。

## 安装/更新执行流

总体来看：

```text
CLI command
  -> target/profile plan builder
  -> per-profile runner
  -> optional update cleanup
  -> manifest + lifecycle output
```

### `init`
- 解析目标范围和安装范围（`user`、`project` 或两者）
- 解析 extras 选择
- 构建安装计划
- 将每个计划交给共享 runner 执行
- 使 hook 脚本可执行（如需要）

### `update`
- 发现选定目标的现有 manifest
- 重建每个配置的更新计划
- 重新恢复 extras 选择，包括旧 manifest 迁移
- 将每个计划交给共享 runner 执行
- 处理过期技能清理
- 写入更新后的 manifest 元数据，并保留回滚安全性

### `explain`
- 暴露 `init` 和 `update` 的计划输出而不改动文件
- 通过 `explain path <relPath>` 展示跟踪文件的来源
- 重用真实的 manifest / source / plan 对象，而不是平行的解释模型

### 生命周期 `--json`
- `init`、`update`、`rollback`、`uninstall` 现在输出机器可读摘要
- `doctor`、`status`、`ci`、`verify-release` 形成审计/运维 JSON 面
- JSON 模式必须在 runner 层保持安静，避免结构化输出被文本日志污染

### `verify-release`
- 为运维提供一个正式的预发布门槛，而不是随意的 shell 仪式
- 运行 `node src/cli.js --help` 作为 CLI 入口烟雾检查
- 运行 `npm test --silent`
- 运行 `npm pack --dry-run --json`
- 检查 tarball 中是否存在必需的产品/文档入口文件

## 通过 manifest 的安全覆盖

更新使用 SHA-256 哈希，而不是三向合并：

1. 每次安装/更新均写入目标特定 manifest，映射 `relPath → sha256`。
2. 下一次更新时，对每个模板文件哈希磁盘上的当前文件：
   - 匹配 manifest → 可以安全覆盖为新模板
   - 与 manifest 不同 → 用户已本地修改 → 以警告跳过
   - 磁盘缺失 → 重新创建
3. `--force` 可覆盖安全保护并覆盖本地修改。

这避免了冲突标记和半合并状态。

## 分发

- 以 npm 包形式分发；`bin: company-cc` 是唯一入口点。
- 模板随包一起发布，位于 `templates/`，运行时读取。
- OpenSpec 是 `peerDependency`，不捆绑在包内。
- Node ≥20，原生 ESM，无构建步骤。

## 为什么是 npm 而不是插件

- 与其他 CLI 工具相同的安装路径。
- 可版本化且易于锁定。
- 在 CI 中可复现。
- 共享 harness 可以面向多个工具，而无需依赖某个提供商的插件系统。
