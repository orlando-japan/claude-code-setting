# 文档首页

语言版本：
- English: `README.md`
- 简体中文：`README.zh-CN.md`

这个目录是 `@company/claude-code-setting` 的**产品化文档层**。

如果你第一次进入这里，**不要随机点文件开始读**。
请优先按角色路径或按目标导航阅读。

## 前 15 分钟怎么读

如果你只有 15 分钟，建议走这条最短路径：

1. `../README.zh-CN.md`
   - 先理解这个包是什么、为什么存在
2. `architecture.md`
   - 再理解生命周期和 `plan -> runner -> cleanup` 三层拆分
3. `authoring-targets.md`
   - 最后理解 Claude / Codex 的差异，以及 target adapter 如何接入共享 control plane
4. `../README.zh-CN.md` 里的 `explain` 与 lifecycle `--json` 示例
   - 看清当前已经对外暴露的解释面与自动化接入面

读完这三份后，你应该能回答：
- 这个包到底安装了什么
- 更新为什么能保持安全
- Claude 和 Codex 为什么可以不同，但又不破坏治理一致性
- 你的角色下一步该读哪份文档

## 权威文档 / Source of Truth

当多份文档都提到同一主题时，按下面这张表认主：

| 主题 | 权威文档 |
|---|---|
| 产品概览 / 打包形态 / 安装面 | `../README.zh-CN.md` |
| 生命周期与内部技术架构 | `architecture.md` |
| built-in target 哲学与 custom target adapter | `authoring-targets.md` |
| Codex 最低完成态 | `codex-target-minimum-completion-checklist.md` |
| rule 参考索引 | `rules-reference.md` |
| 产品未来方向 | `roadmap.md` |

解释规则：
- `README` 是产品入口真源
- `architecture.md` 是技术架构真源
- `authoring-targets.md` 拥有 target 语义解释权
- checklist 文档只负责补充某个窄主题，不能替代产品入口或架构总纲
- leaf authoring docs 负责解释如何扩展某个 surface，不是产品总叙事

## 按角色阅读

### 1. 普通工程师
如果你主要关心的是：怎么安装、怎么用、它到底给我带来了什么，就走这条路径。

推荐顺序：
1. `../README.zh-CN.md`
2. `architecture.md`
3. `authoring-targets.md`

### 2. 团队负责人 / 工程经理
如果你更关心 rollout、治理一致性、以及为什么团队需要这套东西，就走这条路径。

推荐顺序：
1. `../README.zh-CN.md`
2. `architecture.md`
3. `rules-reference.md`
4. `roadmap.md`

### 3. Maintainer / 维护者
如果你会修改 installer 行为、manifest 逻辑、生命周期逻辑或包结构，就走这条路径。

推荐顺序：
1. `../README.zh-CN.md`
2. `architecture.md`
3. `authoring-targets.md`
4. `authoring-overlays.md`
5. 再按需进入各类 leaf authoring docs

### 4. 自定义 target 作者
如果你想为另一个 AI coding tool 新增 target 支持，就走这条路径。

推荐顺序：
1. `authoring-targets.md`
2. `architecture.md`
3. `authoring-overlays.md`

## 按目标阅读

| 目标 | 先看 | 再看 |
|---|---|---|
| 理解这个包到底是什么 | `../README.zh-CN.md` | `architecture.md` |
| 理解系统设计 | `architecture.md` | `authoring-targets.md` |
| 理解 Claude vs Codex 差异 | `authoring-targets.md` | `codex-target-minimum-completion-checklist.md` |
| 新增或修改 custom target | `authoring-targets.md` | `architecture.md` |
| 新增 rules / hooks / commands / skills | `authoring-rules.md`、`authoring-hooks.md`、`authoring-commands.md`、`authoring-skills.md` | `architecture.md` |
| 给团队或仓库做定制化安装 | `authoring-overlays.md` | `authoring-targets.md` |
| 理解未来方向 | `roadmap.md` | `architecture.md` |
| 跑发布前最小 operator gate | `../README.zh-CN.md`（`verify-release`） | `architecture.md` |

## 产品模型

可以把这个包理解为三层产品结构：

1. **Adapters（适配层）**
   - Claude、Codex、custom target 定义 user home、project instruction file、manifest 名称和 required files。
2. **Control plane（控制平面）**
   - `init`、`update`、`doctor`、`status`、`rollback`、`ci` 共用一套生命周期模型。
3. **Governance payload（治理负载层）**
   - rules、skills、hooks、commands、instruction templates 是最终分发到工程师机器上的内容。
4. **Explain / inspection（解释与检查层）**
   - `explain`、`status`、`diff`、`restore` 让 planning、文件 provenance 与当前生命周期状态变成可见能力。

## 内部架构地图

当前实现已经明确拆成三层：

- **plan** → `src/lib/profile-plans.js`
- **runner** → `src/lib/profile-runner.js`
- **cleanup** → `src/lib/update-cleanup.js`
- **explain / inspection** → `src/lib/explain.js`、`src/commands/explain.js`

这意味着：
- command 层应该尽量薄
- planning 负责决定“跑什么”
- runner 负责决定“文件怎么应用”
- cleanup 负责处理“update 之后的专属善后动作”

## 目录内现役文档

| 文件 | 用途 |
|---|---|
| `architecture.md` | 主架构说明与生命周期解释 |
| `authoring-targets.md` | built-in target 哲学与 custom target adapter 说明 |
| `authoring-rules.md` | rule 编写指南 |
| `authoring-skills.md` | skill 编写指南 |
| `authoring-hooks.md` | hook 编写指南 |
| `authoring-commands.md` | command 编写指南 |
| `authoring-agents.md` | agent 编写指南 |
| `authoring-overlays.md` | overlay 定制指南 |
| `codex-target-minimum-completion-checklist.md` | Codex 最低完成态与治理门槛 |
| `roadmap.md` | 产品未来方向 |
| `rules-reference.md` | rule 索引 |
| `prds/claude_code_setting_v0.6_*.md` | v0.6 的 Readiness / PRD / SDD / Closure Review 决策链 |
| `releases/claude_code_setting_v0.6.0_release_note.md` | v0.6.0 的对外 release note |
| `releases/claude_code_setting_v0.6.0_release_commit_scope.md` | v0.6.0 的 release commit scope 裁决 |

## 阅读原则

如果你是第一次理解这个产品，默认顺序是：

1. `../README.zh-CN.md`
2. `architecture.md`
3. `authoring-targets.md`

在没有建立整体模型前，不建议直接从 leaf authoring docs 开始读。
如果两份文档看起来像在讲同一件事，优先回看上面的权威文档表，不要靠猜。
