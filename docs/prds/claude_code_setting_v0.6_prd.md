# Claude-code-setting v0.6 PRD

## 1. 文档类型
- 类型：PRD
- 状态：Draft / Active
- 项目：`@company/claude-code-setting`
- 目标版本：v0.6

## 2. 与既有文档的关系
- 上游文档：
  - `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
  - `docs/roadmap.md`
  - `docs/architecture.md`
  - `docs/authoring-targets.md`
  - `docs/codex-target-minimum-completion-checklist.md`
- 本文档负责：
  - 定义 v0.6 的业务目标、范围边界、成功标准与非目标
  - 裁决 P0 / P1 的进入条件
  - 为后续 SDD、Build Slice、Eval 提供业务真源
- 本文档不负责：
  - 模块级实现设计
  - CLI 内部代码结构细节
  - JSON schema 的最终字段级定义
  - 测试用例清单与 reviewer 执行闭环

## 3. 一句话版本目标
**把 `claude-code-setting` 从“可用的 AI coding harness”升级为“可解释、可集成的 AI 工程治理控制平面”。**

## 4. 为什么现在做 v0.6
当前产品已经完成：
- target adapter（Claude / Codex / custom targets）
- manifest 驱动生命周期（init / update / doctor / status / rollback / ci）
- overlay、rollback、docs home、双语入口、Codex 最低完成态

但仍存在一个关键缺口：

> 内部架构已具备治理能力，但用户和集成方还看不见这些能力如何决策、如何解释、如何结构化接出。

v0.6 的目标不是继续堆更多离散功能，而是把已有内部能力产品化外显。

## 5. 目标用户
### Primary
1. **Maintainer / Operator**
   - 需要理解 install/update 决策过程，定位问题，确认回滚与发布安全性。
2. **Wrapper / CI / Bot integrator**
   - 需要稳定、machine-readable 的生命周期输出，用于自动化编排。
3. **Team lead / Internal platform owner**
   - 需要确认该产品可以被 rollout、解释、治理，并支持多 target 共存。

### Secondary
4. **Individual engineer**
   - 主要消费 install / update / doctor / status 的直接结果。
5. **Custom target author**
   - 会受益于更清晰的 target contract，但不是本轮首要驱动者。

## 6. v0.6 要解决的核心问题
### 问题 1：plan 不可见
用户无法直接理解：
- 本次 `init/update` 会跑哪些 profile
- 为什么命中这些 target/profile
- overlays / extras / cleanup 如何参与决策

### 问题 2：source/provenance 不可见
用户无法直接理解：
- 当前文件来自 baseline、overlay 还是 target-specific template
- 为什么这次 update 覆盖 / 跳过 / 创建了某文件

### 问题 3：生命周期命令集成面不完整
`doctor/status/ci` 已有部分 `--json`，但真正用于自动化的生命周期命令还未完成结构化输出补齐。

### 问题 4：custom target 仍偏“能接入”，不够“可治理”
custom target 当前可用，但缺少更强的最小治理 contract，容易出现“接上了，但质量不一致”的情况。

## 7. 范围裁决
## 7.1 P0（必须进入 v0.6）
### P0-1. plan / explain 可视化
提供一个面向用户和 operator 的解释层，至少满足：
- 能解释 `init/update` 会跑哪些 target/profile
- 能解释 overlays 命中情况
- 能解释 extras 的最终解析结果
- 能解释 update 是否会触发 cleanup
- 能用于人类阅读；若进入 JSON 模式，应可被自动消费

### P0-2. source / provenance 可视化
提供文件来源解释层，至少满足：
- 用户可理解文件来自哪个 source
- 用户可理解 manifest 记录与当前状态的关系
- 用户可理解为什么某文件在 update 中被覆盖 / 跳过 / 创建

### P0-3. 生命周期命令 JSON 输出补齐
优先补齐：
- `init --json`
- `update --json`
- `rollback --json`
- `uninstall --json`

这些命令的结构化输出必须足够稳定，能够供 wrapper / CI / bot 使用。

## 7.2 P1（本轮可选增强）
### P1-1. custom target 最小治理 contract
若资源允许，本轮可补：
- custom target 的更强最小配置校验
- project instruction skeleton 的可扩展校验能力
- doctor/ci 对 custom target 的最小治理约束入口

### P1-2. release / operator 一键验证入口
若资源允许，本轮可补：
- 一个正式 operator 入口，用于执行发布前最小验证
- 统一收口测试、打包、文档打包存在性等检查

当前已落地的最小实现为：
- `company-cc verify-release`
- `company-cc verify-release --json`
- 当前 gate 包含：CLI help smoke、`npm test --silent`、`npm pack --dry-run --json`、关键文档入口打包存在性检查

## 7.3 明确不进入 v0.6 主范围
- CLI 注册表化
- telemetry / usage metrics
- public skill registry / remote catalog
- CLI self-update
- 大规模插件系统化改造
- 为 Codex 镜像 Claude 的 settings / hooks / commands / agents
- 用 3-way merge 替换当前 manifest safe overwrite 模型

## 8. 成功标准
### 8.1 产品成功标准
v0.6 完成后，至少应满足：
1. 用户能理解本次生命周期命令“为什么这么做”。
2. operator 能结构化拿到 lifecycle 输出，不必解析人类日志文本。
3. maintainer 能继续坚持 `plan -> runner -> cleanup` 分层，不因新功能让 command 层重新变厚。
4. 文档层能真实解释新增 explain / provenance / json surface，而不是事后补口径。

### 8.2 最小验收问题
v0.6 验收时必须能回答：
1. explain 是否真实反映 plan，而非手写旁路描述？
2. provenance 是否真实解释 source，而非重复 manifest 原样输出？
3. JSON 输出是否稳定到足以给 wrapper / CI / bot 使用？
4. 若 custom target contract 进入本轮，是否形成了最小可执行的治理门槛？
5. 若 release/operator verify 进入本轮，是否已有正式入口可一键执行最小发布前检查？

## 9. 非目标
本轮明确不做：
1. 不追求把 `claude-code-setting` 变成完整平台后台。
2. 不把每个内部对象都暴露成公共 API。
3. 不把 explain / provenance 做成复杂图形界面产品。
4. 不为了“看起来统一”而抹平 Claude / Codex 的 target 差异。
5. 不把 docs home 继续扩成更多层入口森林。

## 10. 风险与防线
### 风险 1：Scope 膨胀
防线：
- v0.6 先以 P0 三件事为主
- P1 只在 P0 收敛后决定是否进入

### 风险 2：CLI 再次变厚
防线：
- explain / provenance / json 必须复用现有 `plan -> runner -> cleanup` 架构
- 不允许为了省事把复杂逻辑重新堆回 `src/cli.js`

### 风险 3：文档与实现漂移
防线：
- PRD 后必须产出 SDD
- 实现完成后必须同步 README / docs home / architecture / target docs

### 风险 4：JSON surface 漂移
防线：
- 一旦承诺 `--json`，必须视为产品接口
- 后续改动要通过测试和 schema 兼容审视

## 11. 发布类型判断
v0.6 应按 **Preview -> Test -> Production** 的顺序推进：
1. **Preview**：先让 maintainer / operator 使用 explain / provenance / json 评估可读性与真实性。
2. **Test**：在真实 wrapper / CI 脚本中接入最小场景，验证 machine-readable surface。
3. **Production**：当 explain/provenance 真实可靠、JSON 输出稳定、文档同步完成后，再作为正式稳定口径发布。

## 12. 下一阶段交付物
在本 PRD 之后，必须继续产出：
1. `docs/prds/claude_code_setting_v0.6_sdd.md`
   - 负责 explain / provenance / json surface 的实现拆分
2. Build Slice 执行顺序建议：
   - Slice 1：plan / explain
   - Slice 2：source / provenance
   - Slice 3：生命周期命令 JSON 输出
   - Slice 4：P1（如进入）
3. Eval / Preview 验证说明
   - 负责判断输出真实性、schema 稳定性、用户理解成本
