# Claude-code-setting v0.6 Readiness Brief

## 1. 文档类型
- 类型：Readiness Brief
- 状态：Draft / Active
- 项目：`@company/claude-code-setting`
- 目标版本：v0.6

## 2. 与既有文档的关系
- 本文档承接：
  - `docs/roadmap.md`
  - `docs/architecture.md`
  - `docs/authoring-targets.md`
  - `docs/codex-target-minimum-completion-checklist.md`
- 本文档负责：
  - 判断 v0.6 是否值得启动
  - 收敛本轮最小范围
  - 明确主要用户、North Star、风险与验收前置条件
- 本文档不负责：
  - 详细实现拆分（那是 SDD 的职责）
  - 逐命令参数定义与 schema 设计（那是 PRD/SDD 后续职责）
  - 具体代码改动清单与 reviewer 闭环（那是执行包职责）

## 3. 当前阶段判断
`claude-code-setting` 已经不再是单纯的“CLI 小工具修补”阶段，而是一个具备明确产品边界的 AI 工程治理安装器：
- 有 target adapter（Claude / Codex / custom targets）
- 有 manifest 驱动的生命周期（init / update / doctor / status / rollback / ci）
- 有 docs / governance / rollback / CI 组成的运维面
- 有对内分发、对团队 rollout、对 wrapper/CI 集成的产品潜力

因此，后续开发不应再以“想到哪补到哪”的方式推进，而应切回标准 AI 工程流程。

## 4. v0.6 是否值得启动
结论：**值得启动，而且适合以最小功能补齐版启动。**

原因：
1. 当前核心生命周期已基本完整，但“可解释性”和“可集成性”仍弱。
2. 内部架构已完成 `plan -> runner -> cleanup` 收口，具备进一步产品化的结构基础。
3. 文档层已完成双语入口、Documentation Home、权威解释链，适合承接下一轮正式产品版本说明。
4. 下一轮最有价值的不是继续加更多离散功能，而是把已有内部能力显式产品化给用户和集成方看见。

## 5. v0.6 核心问题陈述
当前缺口不是“不能用”，而是“内部已有能力没有充分外显”。

主要问题：
1. 用户无法直接看见本次 `init/update` 的决策过程（plan 不可见）。
2. 用户无法方便理解某个文件的生效来源（source/provenance 不可见）。
3. 生命周期命令的 machine-readable 输出仍不完整，妨碍 wrapper / CI / bot 集成。
4. custom target 虽然已可接入，但缺少更强的完成态与治理 contract。

## 6. v0.6 North Star
**把 `claude-code-setting` 从“可用 harness”推进为“可解释、可集成的 AI 工程治理控制平面”。**

更具体地说：
- 用户要能看见系统为什么这么做
- operator 要能结构化接出自动化能力
- maintainer 要能在不加厚 CLI 主干的前提下继续扩展 target 与生命周期

## 7. 主要用户与优先级
### Primary users
1. **Maintainer / Operator**
   - 关心 install/update 决策过程、可诊断性、回滚安全性、发布验证。
2. **Team lead / Internal platform owner**
   - 关心可 rollout、可解释、可治理、可多 target 复用。
3. **Wrapper / CI / Bot integrator**
   - 关心稳定的 JSON 输出与 deterministic surface。

### Secondary users
4. **Individual engineer**
   - 更偏 install / use / doctor / status 的直接消费方。
5. **Custom target author**
   - 更偏中期扩展面，不一定是 v0.6 首轮核心用户。

## 8. v0.6 建议最小范围
### P0（建议进入 v0.6 主范围）
1. **plan / explain 可视化能力**
   - 让用户看见本次 `init/update` 会跑哪些 profile、命中哪些 overlays、extras 如何解析、cleanup 是否触发。
2. **source / provenance 可视化能力**
   - 让用户看见某个文件来自 baseline、overlay 还是 target-specific source。
3. **生命周期命令的 JSON 输出补齐**
   - 优先补 `init` / `update` / `rollback` / `uninstall` 的 `--json`。

### P1（可选增强，视资源决定）
4. **custom target 最小治理 contract**
5. **release / operator 一键验证入口**

### 明确不进入本轮主范围（P2 或以后）
- CLI 注册表化
- telemetry / usage metrics
- public registry / remote skill catalog
- CLI self-update
- 大规模 plugin marketplace 化

## 9. 不做什么（Non-goals）
v0.6 明确不做：
1. 不追求把 Codex 镜像成 Claude 的富集型 target。
2. 不把 manifest safe overwrite 改造成 3-way merge。
3. 不引入需要后端支持的遥测或使用统计。
4. 不把 custom target 扩展成高度复杂的插件系统。
5. 不为了“命令变多”而提前做大规模 CLI 基础设施重构。

## 10. 启动前最小评估标准
在进入 PRD 和 Build Slice 前，至少要先明确这些评估问题：
1. explain 输出是否真实反映 plan，而不是另写一套旁路文案。
2. provenance 输出是否能帮助用户解释“为什么这个文件被覆盖 / 跳过 / 创建”。
3. JSON 输出是否有稳定 schema，而不是临时对象拼装。
4. 若 custom target 进入 v0.6，是否有最小 contract 可以在 doctor/ci 中被验证。

## 11. 主要风险
1. **Scope 膨胀风险**
   - explain / provenance / json / custom target / release verify 一起做时，容易从最小补齐滑向“重做半个产品层”。
2. **CLI 再次变厚风险**
   - 若不坚持 `plan -> runner -> cleanup` 分层，新增 explain/json 时容易把 orchestration 再塞回 command 层。
3. **文档与实现再次漂移**
   - 文档产品化刚完成，若 PRD/SDD/实现不同步，入口层很快又会失真。
4. **JSON surface 漂移风险**
   - 一旦对外承诺 machine-readable 输出，schema 稳定性就变成产品承诺。

## 12. 建议推进顺序
建议正式进入：
1. **PRD**：聚焦 v0.6 的业务裁决与范围
2. **SDD**：拆 explain / provenance / json surface 的模块实现
3. **Build Slice**：按 explain -> provenance -> json -> optional P1 的顺序切片
4. **Eval / Preview**：在每个切片后验证输出真实性与 schema 稳定性

## 13. Ready / Not Ready 裁决
当前裁决：**Ready for PRD**

理由：
- 方向已收敛
- 产品边界清晰
- P0 / P1 / P2 已可分层
- 当前最大的工作不是继续讨论“值不值得做”，而是把范围写进正式 PRD 并阻止 scope 膨胀

## 14. 下一步
下一步建议立即产出：
- `docs/prds/claude_code_setting_v0.6_prd.md`

该 PRD 需要重点回答：
- v0.6 的单一句话版本目标
- P0 / P1 范围边界
- explain / provenance / json 三件事的成功定义
- 为什么 custom target contract / release verify 是否本轮进入主范围
