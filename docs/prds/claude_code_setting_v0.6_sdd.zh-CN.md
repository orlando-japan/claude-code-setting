# Claude-code-setting v0.6 SDD

## 1. 文档类型
- 类型：SDD
- 状态：Draft / Active
- 项目：`@company/claude-code-setting`
- 目标版本：v0.6
- 上游 PRD：`docs/prds/claude_code_setting_v0.6_prd.md`

## 2. 与既有文档的关系
- 上游业务裁决：
  - `docs/prds/claude_code_setting_v0.6_prd.md`
  - `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
- 依赖现有架构真源：
  - `docs/architecture.md`
  - `docs/authoring-targets.md`
- 本文档负责：
  - 拆解 v0.6 P0 功能的实现边界
  - 约束 explain / provenance / JSON surface 如何接入现有架构
  - 定义模块职责、数据流、验证点与风险控制
- 本文档不负责：
  - 改写 v0.6 的业务目标与范围
  - reviewer 执行记录与验收结论
  - 发布决策本身

## 3. 设计原则
### 3.1 复用现有三层架构
所有 v0.6 P0 功能都必须复用并强化当前：
- `plan` → `src/lib/profile-plans.js`
- `runner` → `src/lib/profile-runner.js`
- `cleanup` → `src/lib/update-cleanup.js`

禁止为了实现 explain / provenance / JSON 输出而把复杂逻辑重新堆回 `src/cli.js` 或各 command 文件。

### 3.2 解释必须来源于真实执行对象
explain 不能重新手写一套“平行解释器”。
它必须直接消费真实的 plan / manifest / source / backup / cleanup 决策对象，避免描述与真实执行分叉。

### 3.3 JSON surface 视为产品接口
一旦为 lifecycle commands 提供 `--json`：
- 结构必须稳定
- 字段必须可解释
- 后续改动必须有兼容意识与测试保护

### 3.4 Source of truth 不新增分裂
v0.6 不应为 explain / provenance 再创造新的权威层。
- 生命周期与执行流仍以 `architecture.md` 为真源
- target 语义仍以 `authoring-targets.md` 为真源
- explain 只是这些现有决策在运行时的可见化产品层

## 4. 目标能力拆解
## 4.1 P0-1：plan / explain 可视化
### 目标
向用户和 operator 暴露“这次准备怎么跑”的决策结果。

### 范围
优先覆盖：
- `init`
- `update`

### 最小可见信息
对于每个 target/profile，至少展示：
- `target`
- `profileName` (`user` / `project`)
- `destRoot`
- `manifestName`
- `srcRoots`
- `selectedExtras`
- `needsBackup`（如适用）
- 是否会进入 cleanup（如适用）
- buildUpdatePlans 产生的 warnings

### 设计方案
新增一个 explain 层，而不是把 explain 拼进每个 command：
- 新模块建议：`src/lib/explain.js`
- 新 command 建议：`src/commands/explain.js`

Explain 层从以下输入构造输出：
- `buildInitPlans(...)`
- `buildUpdatePlans(...)`
- target config
- manifest presence / warnings
- extras resolution 结果

### 推荐命令形态
第一阶段建议：
- `company-cc explain init [flags...]`
- `company-cc explain update [flags...]`
- 支持 `--json`

不建议第一版直接把 explain 塞成 `init --explain` / `update --explain`，因为：
- 更容易污染原 command 流程
- explain 作为独立调试/集成入口更清晰
- 后续更容易扩展到 provenance

## 4.2 P0-2：source / provenance 可视化
### 目标
向用户暴露文件来源和更新决策依据。

### 范围
优先覆盖：
- 已被 manifest 跟踪的文件
- 支持 Claude / Codex / custom target
- 优先挂在 explain 或 status 扩展面，而不是新开很多分散命令

### 最小可见信息
对于某个文件，至少应展示：
- `path`
- `target`
- `profile`
- `destRoot`
- `manifestName`
- manifest 中记录的 `hash`
- manifest 中记录的 `source`
- 当前磁盘状态（unchanged / locally-modified / missing）
- 若解释 update 行为，还需说明：
  - safe overwrite
  - skipped-modified
  - created
  - updated
  的触发原因

### 设计方案
建议分两步：

#### Step A
先增强 explain：
- `company-cc explain path <relPath> [--target ...] [--json]`
- 直接读取 manifest + hash + source 形成解释

#### Step B
如需要再增强 `status`：
- `company-cc status --json` 中为每个 file 增加可选 source 字段
- 或增加 `--verbose`

第一版不建议同时大改 `status` 人类输出，避免与现有使用习惯冲突。

## 4.3 P0-3：生命周期命令 JSON 输出补齐
### 目标
补齐 automation-facing lifecycle surface。

### 命令范围
- `init --json`
- `update --json`
- `rollback --json`
- `uninstall --json`

### 统一输出原则
所有 lifecycle JSON 输出都应尽量共享顶层结构：
```json
{
  "ok": true,
  "command": "update",
  "targets": [...],
  "profiles": [...],
  "warnings": [...],
  "summary": {...}
}
```

### Profile-level structure（建议）
```json
{
  "target": "codex",
  "profile": "user",
  "dest": "~/.codex",
  "manifestName": ".company-cc-codex-manifest.json",
  "counts": {
    "created": 0,
    "updated": 0,
    "unchanged": 0,
    "skippedModified": 0,
    "removed": 0
  },
  "backup": {
    "created": true,
    "path": "..."
  },
  "cleanup": {
    "performed": true,
    "removed": 2
  }
}
```

### 命令级差异
#### `init --json`
重点返回：
- buildInitPlans 结果摘要
- 各 profile 的 apply counts
- next steps 不需要进入 JSON

#### `update --json`
重点返回：
- buildUpdatePlans warnings
- backup 信息
- cleanup 信息
- apply counts

#### `rollback --json`
重点返回：
- backup list or selected backup
- dry-run / confirm 状态
- restored file count

#### `uninstall --json`
重点返回：
- dry-run / confirm 状态
- candidate removals / actual removals
- manifest removal 状态

## 5. 模块设计
## 5.1 新增模块
### `src/lib/explain.js`
职责：
- 将 plan、manifest、source、warnings 统一转换为人类可读和 JSON 可读的 explanation object

建议子能力：
- `explainInit(flags, customTargets)`
- `explainUpdate(flags, customTargets)`