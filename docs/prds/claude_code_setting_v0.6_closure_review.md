# Claude-code-setting v0.6 Closure Review

- 文档类型：Closure Review / Release Note
- 状态：Closed for v0.6 scope
- 日期：2026-05-24
- 上游链路：
  - `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
  - `docs/prds/claude_code_setting_v0.6_prd.md`
  - `docs/prds/claude_code_setting_v0.6_sdd.md`

## 1. 一句话裁决

`claude-code-setting v0.6` 已完成从“可用 harness”到“可解释、可集成的 AI 工程治理控制平面”的最小闭环。

本轮范围内的 **P0** 与进入执行的 **P1** 均已收口完成。

## 2. 本轮完成了什么

### 2.1 P0 已闭环
1. **plan / explain 可视化**
   - 新增 `company-cc explain init`
   - 新增 `company-cc explain update`
   - 支持 `--json`
   - explain 直接复用真实 plan/build objects，而不是平行解释器

2. **source / provenance 可视化**
   - 新增 `company-cc explain path <relPath>`
   - 可解释 manifest source
   - 可解释磁盘状态（`unchanged` / `locally-modified` / `missing`）
   - 可解释 likely update behavior（`safe-overwrite` / `skipped-modified` / `create`）

3. **生命周期命令 JSON 输出补齐**
   - `init --json`
   - `update --json`
   - `rollback --json`
   - `uninstall --json`

4. **文档入口对齐 reality**
   - README / README.zh-CN
   - docs home（中英）
   - architecture
   - authoring-targets
   - roadmap

### 2.2 P1 已落地
1. **P1-1 custom target 最小治理 contract**
   - custom target 支持 `requiredProjectSections`
   - custom target 若声明 `projectSrcs`，必须同时声明 project skeleton contract
   - `doctor` / `ci` 已能对 custom target project file 执行结构校验

2. **P1-2 verify-release / operator verify**
   - 新增 `company-cc verify-release`
   - 新增 `company-cc verify-release --json`
   - 当前最小 gate：
     - `node src/cli.js --help`
     - `npm test --silent`
     - `npm pack --dry-run --json`
     - tarball 关键文档入口存在性检查

## 3. 本轮关键结构变化

### 3.1 内部执行流正式固定为三层
- `plan` → `src/lib/profile-plans.js`
- `runner` → `src/lib/profile-runner.js`
- `cleanup` → `src/lib/update-cleanup.js`

裁决：
- command 层继续保持薄
- explain / provenance / verify-release 均未把复杂逻辑重新堆回 `src/cli.js`

### 3.2 产品/文档模型更清晰
- `README(.zh-CN)`：产品入口真源
- `docs/README(.zh-CN)`：Documentation Home
- `docs/architecture.md`：生命周期与内部执行流真源
- `docs/authoring-targets.md`：target 语义真源

## 4. 最小验证证据

本轮已完成的最小物理验证包括：
- `npm test --silent`
- `npm pack --dry-run`
- `node src/cli.js verify-release --json`

当前封版时最新验证口径：
- `npm test --silent`：通过
- `verify-release --json`：通过
- `verify-release` 当前 step：
  - `cli-help`
  - `tests`
  - `pack`

## 5. 本轮明确不做什么

以下仍不进入 v0.6 主范围：
- CLI 注册表化
- telemetry / usage metrics
- public skill registry / remote catalog
- CLI self-update
- 大规模插件系统化改造
- 为 Codex 镜像 Claude 的 settings / hooks / commands / agents
- 用 3-way merge 替换 manifest safe-overwrite 模型

## 6. 当前版本口径说明

当前仓库 package version 已裁决并更新为：`0.6.0`。

这意味着：
- **v0.6 scope closure = yes**
- **version bump = yes**
- **tag / publish = not implied**

也就是说，本次已经完成版本裁决，但还不自动等同于“已经执行正式发布”。

## 7. 推荐的下一步

若进入真正的发布动作，建议顺序为：
1. 基于当前 closure review 生成 changelog / release note 对外口径
2. 决定是否打 tag
3. 决定是否执行 private registry / npm publish

## 8. 最终裁决

本轮 `claude-code-setting` 的正式封版裁决为：

- **P0：Closed**
- **P1-1：Closed**
- **P1-2：Closed**
- **文档对账：Closed**
- **最小 operator gate：Closed**

结论：

> `claude-code-setting v0.6` 的目标范围已经收口，可以进入版本裁决 / 发布裁决阶段。
