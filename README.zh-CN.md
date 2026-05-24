# @company/claude-code-setting

> **“把 AI 从概率性生成器，变成可控的工程执行力量。”**

语言版本：
- English: `README.md`
- 简体中文：`README.zh-CN.md`

文档入口：
- English docs home：`docs/README.md`
- 中文文档首页：`docs/README.zh-CN.md`
- 架构说明：`docs/architecture.md`
- Target 适配说明：`docs/authoring-targets.md`

如果你想最快建立整体认知，优先先读你对应语言的 docs 首页。

---

## 这是什么

`@company/claude-code-setting` 是一个面向团队内部的 **AI 编码治理安装器**。

它的作用不是替代 Claude Code 或 Codex 本身，而是：
- 把一套共享规则、技能、命令、hooks、项目指令模板
- 以可追踪、可回滚、可更新的方式
- 安装到工程师的本地 AI 编码环境里

你可以把它理解为一个小型的 **AI Engineering Control Plane**。

---

## 为什么存在

AI 编码真正危险的地方，不是“模型不够聪明”，而是：

1. **规则碎片化**
   - 每个人的 AI 提示、规则、技能都不一样，团队执行口径会漂。
2. **架构漂移**
   - 文档写一套，代码做一套，AI 越改越偏。
3. **更新不安全**
   - 工程师改过的本地文件，被后续升级粗暴覆盖。
4. **多工具治理断层**
   - Claude 和 Codex 各自一套，团队无法共享统一治理基线。

这个包的目标就是：

- 提供统一的共享规则基线
- 让 Claude / Codex 共用同一套生命周期治理
- 用 manifest + hash 做安全更新
- 通过 hook / CI / skill 把治理落到物理文件和执行链里

---

## 当前状态

**v0.6.0** — 已可用于团队内部稳定分发。

已具备：
- 完整生命周期：`init / update / uninstall / rollback`
- 44 个 skills，分为 6 组，可按组或按名称安装
- 9 条共享 rules
- 本地 hooks + 文档治理 watch + CI 检查
- `explain` 命令：支持 `explain init`、`explain update`、`explain path <relPath>`
- `verify-release` 命令：提供 operator 可直接执行的发布前最小验证（`node src/cli.js --help` + `npm test` + `npm pack --dry-run` + 打包文档存在性）
- 生命周期与审计命令的 `--json` 输出：`init / update / rollback / uninstall / doctor / status / ci / verify-release`
- `.company-cc.json` overlay 与 custom target adapter 支持
- 交互式 `init`
- 旧 manifest 的兼容迁移

依然保持轻量：
- 无 build step
- OpenSpec 仍是可选 peer dependency
- 发布验证以 `npm test` + `npm pack --dry-run` 为主

---

## 产品模型

理解这个包，最简单的方式是看它的三层结构：

### 1. Target adapter 层
定义不同 AI 工具的入口差异：
- Claude
- Codex
- 未来的 custom target

### 2. Control plane 层
统一治理生命周期：
- `init`
- `update`
- `doctor`
- `status`
- `rollback`
- `ci`

### 3. Governance payload 层
真正分发到用户机器上的内容：
- rules
- skills
- hooks
- commands
- project instruction files

### 4. Explain / inspection 层
把原本隐式的安装决策、文件来源和生命周期状态变成可见能力：
- `explain`
- `status`
- `diff`
- `restore`

---

## 当前内部控制流（已对齐最新代码）

现在安装 / 更新的内部实现已经明确拆成三层：

### plan
- `src/lib/profile-plans.js`
- 决定本次要跑哪些 target/profile 组合

### runner
- `src/lib/profile-runner.js`
- 负责应用模板文件、统计结果、写 manifest 元数据

### cleanup
- `src/lib/update-cleanup.js`
- 负责 update 之后的清理动作，例如 extras 缩小时删除 stale skills

也就是说，现在的执行链路是：

```text
CLI command
  -> plan
  -> runner
  -> cleanup（仅 update 时需要）
  -> manifest / output
```

这个拆分的价值是：
- command 层更薄
- planning / applying / cleanup 可以独立测试
- 后面新增 target 或调整 update 逻辑时，不容易互相污染

---

## 推荐安装方式

- **你正在本机开发这个仓库**：优先 `npm link`
- **想让同事先试用但还没正式发包**：用本地 tarball 或私有 npm registry
- **想做可重复的团队内分发**：发到私有 npm registry

一句话：
**先本地开发，再私有分发，最后才考虑公共 npm。**

---

## 安装

### 方式 A：从 npm / 私有 npm 安装

```bash
npm i -g @company/claude-code-setting
# 如需 spec workflow，可选安装
npm i -g @fission-ai/openspec
```

### 方式 B：先把仓库拉到本地，再本地安装

#### B1. 开发模式（`npm link`）

```bash
git clone https://github.com/orlando-japan/claude-code-setting.git
cd claude-code-setting
npm install
npm link

company-cc --help
```

#### B2. 本地 tarball 安装

```bash
git clone https://github.com/orlando-japan/claude-code-setting.git
cd claude-code-setting
npm install
npm pack
npm i -g ./company-claude-code-setting-*.tgz

company-cc --help
```

#### B3. 私有 npm registry 安装

```bash
npm publish --registry <your-private-registry>
npm i -g @company/claude-code-setting --registry <your-private-registry>
```

---

## 快速开始

```bash
# 默认：安装 Claude user profile (~/.claude/) + Claude project file (./CLAUDE.md)
company-cc init

# 安装 Codex user profile 到 $CODEX_HOME 或 ~/.codex
company-cc init --user --target codex

# 同时安装 Claude 和 Codex user profile
company-cc init --user --target both

# 只安装 project 级文件
company-cc init --project

# 同时安装 Claude + Codex 的 project instruction files
company-cc init --project --target both

# 安装默认 core skill group
company-cc init --user --extras

# 安装某个 skill group
company-cc init --user --extras=review

# 混装 group 和单个 skill
company-cc init --user --extras=core,code-review,incident-response

# 安装全部 skills
company-cc init --user --extras=all

# 查看 skills
company-cc skills list

# 更新
company-cc update

# 强制覆盖本地改动
company-cc update --force

# 预览但不写入
company-cc update --dry-run

# 检查安装状态
company-cc doctor

# 查看全部 tracked files 状态
company-cc status

# 解释 init / update 本次到底会怎么跑
company-cc explain init --target codex --json
company-cc explain update

# 解释某个文件来自哪里，以及 update 会怎么对待它
company-cc explain path rules/code-style.md

# CI 检查
company-cc ci

# 回滚
company-cc rollback --list
company-cc rollback --confirm

# 给 operator 用的发布前最小验证
company-cc verify-release
company-cc verify-release --json

# 给自动化 / CI wrapper 用的 JSON 输出
company-cc init --json
company-cc update --json
company-cc rollback --json
company-cc uninstall --json
company-cc doctor --json
company-cc status --json
company-cc ci --json
company-cc verify-release --json
```

---

## Codex 的最低完成态

Codex 是一个 **轻量 target**，但不是一个 **弱治理 target**。

把 Codex 判定为“完成”的最低标准是：
- user profile 已安装 shared rules + `AGENTS.md`
- project `AGENTS.md` 已存在且完成自定义
- `doctor --target codex` 能正确检查安装状态
- `ci --target codex` 能检查 project `AGENTS.md` 不是 stub，并且至少包含这些 section：
  - `What this project is`
  - `How to run and verify`
  - `Important paths`
  - `Current priorities`
  - `Guardrails / do-not-touch`

这**不代表**：
- 要给 Codex 镜像一套 Claude 的 settings / hooks / commands / agents
- 要追求 Claude / Codex 的文件树完全一致

这里的原则是：

> **治理逻辑一致，不追求文件树镜像一致。**

---

## 文档导航

按目标阅读：

| 你想知道什么 | 先看哪份 |
|---|---|
| 把这个包当产品理解 | `docs/README.md` |
| 想理解 install/update 内部架构 | `docs/architecture.md` |
| 想理解 Claude / Codex / custom target | `docs/authoring-targets.md` |
| 想理解 skill / rule / overlay 如何编写 | `docs/authoring-skills.md`、`docs/authoring-rules.md`、`docs/authoring-overlays.md` |
| 想理解 Codex 最低完成态 | `docs/codex-target-minimum-completion-checklist.md` |

---

## 开发与验证

```bash
npm test
npm pack --dry-run
node src/cli.js --help
node src/cli.js doctor
```

推荐在改 installer 行为时重点验证：
- `npm test`
- 临时 `HOME` 下的真实 install/update smoke
- `npm pack --dry-run`

---

## 结论

这个仓库不是“提示词合集”，也不是“Claude 专用小插件”。

它本质上是一个：
- 面向团队的
- 可分发、可追踪、可回滚的
- AI 编码治理安装器

如果你想看更技术化的说明，下一步读：
1. `docs/README.md`
2. `docs/architecture.md`
3. `docs/authoring-targets.md`
