# 规则参考

规则存放在 `templates/shared/rules/`，并由 `company-cc init` 安装到 `~/.claude/rules/`（和 `~/.codex/rules/`）。它们构成每次 AI 会话的**始终在线行为约束**。

## 哪些规则默认处于激活状态？

Claude 配置会通过 `templates/claude-user/CLAUDE.md` 中的 `@rules/<name>.md` 导入规则。任何列在那里规则会自动加载到每个 Claude Code 会话。未列出的规则仍可在磁盘上找到，但在项目 `CLAUDE.md`（或你个人的 `~/.claude/CLAUDE.md`）添加之前不会激活。

| 规则文件 | CLAUDE.md 默认 | 摘要 |
|---|---|---|
| `coding-principles.md` | ✓ | 先思考再编码，简洁优先，手术式修改，目标驱动执行 |
| `code-style.md` | ✓ | 匹配当前文件的风格，减少注释，依赖卫生 |
| `security.md` | ✓ | 在边界处验证输入，不在代码/日志/错误中暴露秘密，失败封闭的认证 |
| `error-handling.md` | ✓ | 以上下文包装错误，在处理器处记录一次，区分用户和内部错误 |
| `observability.md` | ✓ | 结构化日志、trace ID 传播、不记录 PII/秘密、症状驱动告警 |
| `commit-conventions.md` | ✓ | 约定式提交，一次逻辑变更一个提交，正文说明为什么 |
| `testing.md` | ✓ | 关注行为不是实现，测试金字塔，不对自有代码大量 mock，零容忍不稳定 |
| `api-design.md` | — | HTTP 语义、状态码、一致错误 JSON、版本化、处理器分层 |
| `data-access.md` | — | 迁移安全、N+1 防范、事务、参数化 SQL、批量操作仪式 |

---

## 规则描述

### `coding-principles.md`

四个核心工作原则：**在动手前先思考**（明确假设，验证关键假设）、**简洁**（精确解决需求）、**手术式**（修改最少行，保持无关代码不变）、**目标驱动**（先定义可验证的完成标准，再检查是否达成）。这些是所有其他规则的根约束。

### `code-style.md`

样式一致性胜过个人偏好。匹配你正在编辑文件的缩进、命名和导入顺序。不要顺手格式化。语言特定默认值（TypeScript strict mode、Python ruff + 类型提示、Go gofmt、Rust clippy）。依赖卫生：不要为了省五行而新增一个依赖。

### `security.md`

只在系统边界验证输入。绝不将用户输入插入 shell、SQL、HTML 或文件路径。秘密绝不出现在代码、日志或错误信息中。认证必须始终在服务端 —— UI 隐藏按钮不是授权。针对 AI 会话：不允许 `rm -rf`，不允许强推，不允许未经明确用户确认修改 git 配置。

### `error-handling.md`

每个错误都必须被处理 —— 返回、记录，或用注释明确丢弃。在层边界处用操作上下文包装错误（不要只写“发生错误”）。**在处理器处只记录一次** —— 如果你返回了错误，就不要再重复记录。面向用户的错误简短且不包含内部细节；内部错误则携带完整上下文。启动时缺少配置时可 panic，业务请求处理代码中不要 panic。

### `observability.md`

生产环境使用结构化（JSON）日志。每行日志都包含 `service`、`level`、`timestamp`、`trace_id`。记录**事件**（“支付拒绝”），而不是代码路径（“进入 processPayment”）。永远不要记录秘密、令牌、PII 或高频正常操作。入口点生成 trace ID 并向下传递。告警应基于用户可见症状（错误率、延迟 p99），而不是基础设施指标（CPU）。

### `commit-conventions.md`

遵循 Conventional Commits 格式（`feat:`、`fix:`、`refactor:` 等）。主题使用祈使语气，小写，≤ 72 字符。正文说明**为什么**，不是做了什么（diff 已经展示了什么）。一个提交对应一次逻辑变更。不要提交秘密、生成文件或 `console.log` 调试代码。

### `testing.md`

测试关注行为，而不是实现。三类用例：正常、边界、失败。Bug 修复必须附带复现测试。测试金字塔：大量单元、部分集成（针对真实数据库）、少量 E2E。不 mock 你拥有的代码。测试数据最小且确定性强。不稳定测试就是坏测试 —— 修复或删除，绝不重试。

### `api-design.md` *(可选)*

HTTP 动词有定义语义：GET 为安全，PUT/DELETE 为幂等。状态码很重要：4xx 表示客户端错误，5xx 表示服务器故障，不能混用。所有错误响应使用统一 JSON 结构，包含机器可读的 `code` 字段。版本化采用 `/v1/` 前缀；新增为兼容，移除先弃用再删除。集合分页应支持游标，最大 100。HTTP 处理器只负责解析、委派、序列化 —— 不包含业务逻辑。

**启用场景：** 任何暴露或调用 HTTP API 的项目。将 `@rules/api-design.md` 添加到项目 `CLAUDE.md`。

### `data-access.md` *(可选)*

所有 schema 变更都通过版本化、可回滚的迁移文件。每次迁移必须与上一版本向后兼容（滚动部署）。N+1 查询是 bug — 使用关联或批量加载。大型表查询发布前执行 `EXPLAIN ANALYZE`。事务应短且只涵盖一次逻辑操作，不包含外部副作用。SQL 始终参数化。生产环境任何批量 DELETE/UPDATE 前，先执行 SELECT 并检查行数。

**启用场景：** 任何使用关系数据库的项目。将 `@rules/data-access.md` 添加到项目 `CLAUDE.md`。

---

## 向特定项目添加规则

在你项目的 `CLAUDE.md` 中：

```markdown
@rules/api-design.md
@rules/data-access.md
```

这些路径相对于 `~/.claude/rules/`（或 `~/.codex/rules/`）解析，`company-cc init` 会将它们安装到该位置。

## 编写新规则

参见 [Authoring rules](authoring-rules.md) 以获取格式、命名和审查清单。
