# Claude-code-setting v0.6.0 Release Commit Scope

- 文档类型：Release Commit Scope Decision
- 目标版本：`0.6.0`
- 日期：2026-05-24
- 配套文档：
  - `docs/prds/claude_code_setting_v0.6_closure_review.md`
  - `docs/releases/claude_code_setting_v0.6.0_release_note.md`

## 1. 一句话裁决

`v0.6.0` 应采用 **单一 release commit** 收口。

原因：本轮改动虽然跨代码、测试、README、架构文档与 release note，但它们共同服务于同一个版本目标：
- explain / provenance
- lifecycle JSON surface
- custom target governance contract
- verify-release operator gate
- v0.6.0 版本口径与对外文档

把这些拆成多个无关提交，反而会削弱 tag 前的可回指性。

## 2. 推荐 commit 主题

推荐 commit title：

```text
release: finalize claude-code-setting v0.6.0
```

若想更强调能力面，也可用：

```text
release: ship claude-code-setting v0.6.0 explain/json/governance surfaces
```

## 3. 应进入本次 release commit 的文件范围

### 3.1 核心代码
#### CLI 入口与命令层
- `src/cli.js`
- `src/commands/init.js`
- `src/commands/update.js`
- `src/commands/doctor.js`
- `src/commands/ci.js`
- `src/commands/rollback.js`
- `src/commands/uninstall.js`
- `src/commands/explain.js`
- `src/commands/verify-release.js`

#### 内部执行流 / 能力库
- `src/lib/extras.js`
- `src/lib/profile-plans.js`
- `src/lib/profile-runner.js`
- `src/lib/update-cleanup.js`
- `src/lib/explain.js`
- `src/lib/project-checks.js`
- `src/lib/config.js`
- `src/lib/release-verify.js`

### 3.2 测试
- `test/cli.test.js`
- `test/explain.test.js`
- `test/profile-plans.test.js`
- `test/profile-runner.test.js`
- `test/update-cleanup.test.js`
- `test/verify-release.test.js`

### 3.3 模板 / target 资产
- `templates/codex-project/AGENTS.md`

### 3.4 产品与架构文档
- `README.md`
- `README.zh-CN.md`
- `docs/README.md`
- `docs/README.zh-CN.md`
- `docs/architecture.md`
- `docs/authoring-targets.md`
- `docs/codex-target-minimum-completion-checklist.md`
- `docs/roadmap.md`

### 3.5 v0.6 决策链与发布口径文档
- `docs/prds/claude_code_setting_v0.6_readiness_brief.md`
- `docs/prds/claude_code_setting_v0.6_prd.md`
- `docs/prds/claude_code_setting_v0.6_sdd.md`
- `docs/prds/claude_code_setting_v0.6_closure_review.md`
- `docs/releases/claude_code_setting_v0.6.0_release_note.md`

### 3.6 版本文件
- `package.json`

## 4. 不应混入本次 release commit 的内容

当前检查结果下，**未发现明显与 v0.6.0 无关的脏改动**。

但在正式提交前，仍应继续排除以下内容：
- 本地试验性脚本
- 临时调试输出
- 与 `v0.6.0` 无关的 README 重写
- 未来版本（例如 `0.6.1` / `0.7.0`）才会进入的额外 operator gate 扩张
- 与 publish/tag 无关的仓库清洁动作

## 5. 预提交检查单

在真正提交前，至少确认：

- [ ] `npm test --silent` 通过
- [ ] `node src/cli.js verify-release --json` 通过
- [ ] `package.json` 版本为 `0.6.0`
- [ ] `README.md` / `README.zh-CN.md` 版本口径为 `0.6.0`
- [ ] closure review 已反映 version bump = yes, tag/publish = not implied
- [ ] release note 已存在：`docs/releases/claude_code_setting_v0.6.0_release_note.md`
- [ ] 工作树中没有额外临时文件或与本版本无关的新增文件

## 6. 推荐暂不拆分的理由

本次不建议拆成：
- “代码提交”
- “文档提交”
- “版本号提交”

原因：
1. 当前 release note、closure review、README、roadmap 与代码能力是强耦合的同一版本叙事。
2. `0.6.0` tag 需要一个完整的、可回看的一次性提交锚点。
3. 对外 release communication 已经生成，若再拆 commit，会让 tag 前的审计链变散。

## 7. Git 收口建议

若准备正式进入 release commit，可按这类思路收口：

```bash
git add \
  package.json \
  README.md README.zh-CN.md \
  docs/README.md docs/README.zh-CN.md \
  docs/architecture.md docs/authoring-targets.md docs/codex-target-minimum-completion-checklist.md docs/roadmap.md \
  docs/prds/claude_code_setting_v0.6_readiness_brief.md \
  docs/prds/claude_code_setting_v0.6_prd.md \
  docs/prds/claude_code_setting_v0.6_sdd.md \
  docs/prds/claude_code_setting_v0.6_closure_review.md \
  docs/releases/claude_code_setting_v0.6.0_release_note.md \
  src/cli.js src/commands/*.js src/lib/*.js \
  templates/codex-project/AGENTS.md \
  test/cli.test.js test/explain.test.js test/profile-plans.test.js test/profile-runner.test.js test/update-cleanup.test.js test/verify-release.test.js
```

提交前再跑：

```bash
npm test --silent
node src/cli.js verify-release --json
```

## 8. 最终裁决

本次 `v0.6.0` 的 release commit scope 裁决为：

- **建议单一 release commit**：Yes
- **允许进入该 commit 的范围**：本清单第 3 节所列全部文件
- **是否建议现在立刻打 tag**：No
- **下一步**：先形成这次 release commit，再进行 tag 裁决复核
