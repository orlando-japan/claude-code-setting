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
- `explainPath(relPath, flags, customTargets)`

### `src/commands/explain.js`
职责：
- 提供 CLI 入口
- 调用 `src/lib/explain.js`
- 处理人类输出 / JSON 输出切换

## 5.2 扩展现有模块
### `src/cli.js`
仅做最小扩展：
- 注册 `explain` 命令
- 增加 explain 的 usage / valid flags

禁止在 `src/cli.js` 内嵌 explain 的业务逻辑。

### `src/commands/init.js`
增加 `--json` 输出支持：
- 复用现有 plan + runner
- 输出结构化 profile 执行结果

### `src/commands/update.js`
增加 `--json` 输出支持：
- 复用现有 plan + runner + cleanup
- 输出 warnings / backup / removed count

### `src/commands/rollback.js`
增加 `--json` 输出支持：
- 对 listOnly / dry-run / confirm 三种模式分别建模

### `src/commands/uninstall.js`
增加 `--json` 输出支持。

### `src/commands/status.js`
保持主逻辑不大改；若需要 provenance 辅助，优先扩展 JSON 输出而非重写人类输出。

## 5.3 数据对象收口建议
为避免各 command 自己拼 JSON，建议新增轻量结果对象 builder：
- `src/lib/command-results.js`（可选）

若不新增文件，也应在 explain/lifecycle commands 中统一采用同一结果 shape，禁止每个 command 自由发挥。

## 6. 控制流设计
## 6.1 explain init
```text
CLI explain init
  -> parse flags
  -> load custom targets / overlays
  -> resolve extras
  -> buildInitPlans
  -> normalize explanation object
  -> render text or json
```

## 6.2 explain update
```text
CLI explain update
  -> parse flags
  -> load custom targets / overlays
  -> buildUpdatePlans
  -> attach warnings / backup / cleanup intent
  -> render text or json
```

## 6.3 update --json
```text
CLI update --json
  -> buildUpdatePlans
  -> run each plan
  -> collect backup/apply/cleanup results
  -> print structured result
```

## 6.4 provenance explain path
```text
CLI explain path <relPath>
  -> resolve target/profile candidates
  -> inspect manifests
  -> inspect file existence + hash
  -> explain source + state + likely update behavior
  -> render text or json
```

## 7. 测试设计
## 7.1 Explain tests
新增测试文件建议：
- `test/explain.test.js`

至少覆盖：
1. `explain init --target codex` 能输出 user/project plan
2. `explain update` 能反映 warnings / backup / cleanup intent
3. `explain path <relPath>` 能输出 source + state
4. `--json` 输出结构稳定且字段存在

## 7.2 Lifecycle JSON tests
在现有 CLI tests 或新增专用 tests 中覆盖：
1. `init --json`
2. `update --json`
3. `rollback --json`
4. `uninstall --json`

重点验证：
- 顶层字段存在
- profile summary 存在
- warnings / backup / cleanup 结构正确
- dry-run 与 confirm 模式差异明确

## 7.3 Regression guard
已有：
- `profile-plans.test.js`
- `profile-runner.test.js`
- `update-cleanup.test.js`

v0.6 新测试必须继续复用这些分层，不允许重新退化为只靠巨大 CLI 烟囱测试兜底。

## 8. 风险控制
### 风险 1：explain 旁路化
控制：
- explain 只能消费真实 plan / manifest / source 数据
- 不允许复制一套平行决策逻辑

### 风险 2：JSON 结构碎片化
控制：
- lifecycle command 共享统一顶层结构
- 顶层 key 命名尽量稳定

### 风险 3：status 被过度改造
控制：
- provenance 第一版优先挂 explain path
- 不急着重做 status 的人类输出

### 风险 4：custom target 被提前拉进过深
控制：
- v0.6 P0 不依赖 custom target contract 全量落地
- custom target contract 维持 P1，可单独切 slice

## 9. Build Slice 建议
### Slice 1：Explain foundation
- `src/lib/explain.js`
- `src/commands/explain.js`
- explain init/update
- explain JSON 输出

### Slice 2：Path provenance
- explain path
- source/state/update-behavior explanation

### Slice 3：Lifecycle JSON
- `init/update/rollback/uninstall --json`
- 统一结果 shape

### Slice 4（可选）：P1
- custom target 最小治理 contract
- release/operator verify 入口

## 10. 验收前必须回答的问题
1. explain 是否完全来源于真实 plan/build objects？
2. provenance 是否解释了“为什么”，而不是只重复“是什么”？
3. lifecycle JSON 是否足以支撑 wrapper / CI / bot 最小接入？
4. 新功能是否保持了 `plan -> runner -> cleanup` 的架构边界？
5. 文档是否同步说明了 explain/provenance/JSON surface？
