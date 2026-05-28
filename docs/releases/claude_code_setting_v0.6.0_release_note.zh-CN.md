# Claude-code-setting v0.6.0 发布说明

- 版本：`0.6.0`
- 状态：准备发布沟通
- 日期：2026-05-24
- 内部参考文档：
  - `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
  - `docs/prds/claude_code_setting_v0.6_prd.md`
  - `docs/prds/claude_code_setting_v0.6_sdd.md`
  - `docs/prds/claude_code_setting_v0.6_closure_review.md`

## 概要

`v0.6.0` 将 `claude-code-setting` 从“可用的内部 harness”升级为“更可解释、更易集成的 AI 工程治理控制平面”。

本次发布聚焦于三大成果：
- 使生命周期行为更易解释
- 使生命周期输出更易供自动化/运维使用
- 收紧 custom target 治理，保持 CLI 核心轻量不膨胀

## 新增内容

### 1. Explain / provenance 能力
新增可解释命令：
- `company-cc explain init`
- `company-cc explain update`
- `company-cc explain path <relPath>`
- 支持 explain 流的 JSON 模式

这些命令暴露了：
- 会运行哪些 target/profile plans
- 解析后的 extras / overlays 上下文
- 文件 provenance（`source`）
- 当前磁盘状态与可能的 update 行为

### 2. 生命周期 JSON 输出能力
关键生命周期命令已支持机器可读输出：
- `init --json`
- `update --json`
- `rollback --json`
- `uninstall --json`

这让 harness 更适合由 CI、bot 和运维流程包装，而无需解析人类日志文本。

### 3. Custom target 治理收紧
Custom target 现在支持最小项目治理 contract，如 `requiredProjectSections`。

这意味着：
- custom project target 不仅可以接入
- 还可以被 `doctor` / `ci` 结构化校验

### 4. Operator 发布验证
新增发布门禁：
- `company-cc verify-release`
- `company-cc verify-release --json`

当前最小检查内容：
- CLI help smoke (`node src/cli.js --help`)
- `npm test --silent`
- `npm pack --dry-run --json`
- tarball 中必须的文档 / 产品入口文件存在

## 架构影响

本次发布保持内部控制流与设计分层对齐：
- `plan`
- `runner`
- `cleanup`

新增 surface 不会把编排复杂度重新推回 `src/cli.js`。

## 文档更新

文档现在更真实反映产品面：
- 双语 README 入口
- 双语 docs home
- 架构真源文档
- target authoring 真源文档
- v0.6 版本决策链与发布沟通材料

## 非目标 / 未包含内容

本次发布不包含：
- plugin 平台重写
- telemetry / 使用统计
- 自升级流程
- Codex 镜像 Claude 专属 runtime 资产
- 用 3-way merge 替代 manifest safe-overwrite

## 验证快照

发布验证当前通过：
- `npm test --silent`
- `node src/cli.js verify-release --json`

当前生成包文件名：
- `company-claude-code-setting-0.6.0.tgz`

## 推荐对外一句话

> `claude-code-setting v0.6.0` 增加了解释性、机器可读的生命周期输出、收紧的 custom target 治理和正式发布验证门禁，同时保持轻量的 `plan -> runner -> cleanup` 架构。