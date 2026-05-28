# 路线图

本文档记录了 harness 的计划功能扩展。它是在 0.1.x 基线稳定后起草的（init / update / doctor + 双目标支持）。

## 指导性约束

在接受任何新功能前，请先对照 `docs/architecture.md` 中的设计理念：

- **薄型提供方适配器。** 不要把每个工具的所有特性都塞进一个单体。
- **基于 manifest 的安全覆盖。** 不要用 3-way merge 替代 SHA-256 哈希。
- **文档反映现实。** 不要有占位命令或未实现的 flag。
- **优先私有/内部分发。** 不要为了公共 npm 优化，除非真的需要。

---

## 第一阶段 — 可观察性与安全回滚 ✓ 已在 v0.2.0 发布

manifest 已经跟踪每个文件的 SHA-256，但用户无法看到这些信息。本阶段在现有模型上添加了一层读取访问。

每个命令可独立发布；无一触及核心安装逻辑。

v0.2.0 中的 manifest 模式扩展：文件记录现在为 `{ hash, source }` 对象。
旧字符串哈希 manifest 仍可通过 `getFileRecord` 兼容读取。
`source` 字段记录每个文件来自哪个模板目录 —— 这是 `diff` 和 `restore` 所需，并为第三阶段的 overlay 层预置。

### `status` 命令 ✓

列出每个 manifest 跟踪文件的当前状态：

| 状态 | 含义 |
|---|---|
| `unchanged` | 磁盘哈希与 manifest 匹配 |
| `locally-modified` | 磁盘哈希与 manifest 不同 |
| `missing` | manifest 跟踪但磁盘中缺失 |
| `drifted` | 文件存在，但不在 manifest 中（harness 未跟踪） |

用法：

```
company-cc status [--target <claude|codex|both>]
```

### `diff <path>` 命令 ✓

对比本地修改文件与 harness 发布的模板版本。

```
company-cc diff rules/coding-principles.md
```

只读。让用户在 `--force` 之前做出知情决策。

### `restore <path>` 命令 ✓

将文件恢复为模板版本，并更新 manifest 条目。写入前会确认。

```
company-cc restore rules/coding-principles.md
```

是 `diff` 之后的自然下一步。

### `uninstall` 命令 ✓

从目标 home 卸载，保留用户新增文件，然后删除 manifest。默认以 dry-run 运行；需要 `--confirm` 才会实际执行。

```
company-cc uninstall [--target <claude|codex|both>] [--confirm]
```

---

## 第二阶段 — 编写与运维体验

打磨模板作者和团队运维者的体验。

### 细粒度 `--extras` ✓

```
company-cc init --extras              # 安装所有 extras（当前行为）
company-cc init --extras=ops,frontend # 仅安装指定 bundle
```

向后兼容：裸 `--extras` 仍然安装全部。

### `doctor` 中的项目文件语义校验

安装后解析项目 `CLAUDE.md` / `AGENTS.md`，如果必需骨架章节依旧未填写则发出警告：

- 这个项目是什么
- 如何运行和验证它
- 当前优先级
- guardrails / 风险区域

仅发出警告；不阻断。

### 交互式 `init` ✓

### `--json` 输出模式 ✓

为所有命令添加 `--json` flag。返回机器可读摘要，适用于 CI 包装器。

```
company-cc doctor --json
company-cc status --json
```

### `company-cc ci` 检查 ✓

退出码非零的 alias 或子命令，当项目级说明文件缺失或其 manifest 过期时失败。设计为在采用 harness 的仓库中作为 CI 步骤运行。

### `verify-release` 运维门禁 ✓

为维护者 / 运维者提供正式的预发布入口：

```bash
company-cc verify-release
company-cc verify-release --json
```

当前最小 gate：
- CLI help smoke (`node src/cli.js --help`)
- `npm test --silent`
- `npm pack --dry-run --json`
- tarball 中必须的文档/产品入口文件存在性检查

---

## 第三阶段 — 可扩展性

这是战略阶段。使“公司范围”意味着一个基线加多层团队自定义，而不是一个单体。

### 团队 overlay 层 ✓

添加对层叠在公司基线之上的额外模板源的支持。

用户或项目级别的 `.company-cc.json` 可以声明额外源：

```json
{
  "overlays": [
    "./team-templates",
    "@team/harness-addons"
  ]
}
```

Overlay 优先级：`personal > team > company baseline`。后声明的源在文件冲突时胜出。

manifest 扩展：每个跟踪文件记录其 `source`，以便冲突可追溯。

这是在不 fork 仓库的情况下实现团队定制的关键。

### 自定义目标适配器 ✓

让 `src/lib/targets.js` 中的 `TARGETS` 可通过配置或插件入口扩展，使第三方可以注册 Cursor、Aider、Gemini CLI 等，而无需修改核心。

候选接口：`company-cc.targets.<name>` 字段写入包的 `package.json`，运行时从 `node_modules` 解析。

---

## 第四阶段 — 美化项

较低优先级。出现明确需求时再加。

### `backup` / `rollback` ✓

在每次 `update` 前，将所有已跟踪文件的当前状态快照到 `~/.claude/.company-cc-backups/<timestamp>/`。添加 `company-cc rollback` 来恢复最近一次备份。

### 模板作者 linter ✓

开发时工具（可能仅作为 npm 测试脚本），验证：

- Skill 和 Command frontmatter 完整性
- `@rule` 导入路径是否解析
- `settings.json` 是否符合目标公开的 JSON schema

### 明确非目标

以下内容已考虑但无限期推迟：

- **遥测 / 使用情况指标** — 需要后端；复杂度/收益比差。
- **Skill 注册表 / 远程目录** — 第三阶段的 overlay 已覆盖团队分发；公共注册表是推测性的。
- **CLI 自升级（`company-cc upgrade`）** — `npm i -g @company/claude-code-setting@latest` 已可行。
