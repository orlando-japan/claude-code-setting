# Codex target 最小补齐清单

日期：2026-05-24
状态：Draft

---

## 0. 目的

本清单用于定义：

> **Codex 作为 built-in target，最低需要补到什么程度，才算治理定义完整。**

本清单不追求把 Codex 做成 Claude 的镜像版本。
目标是：
- 补齐 Codex 的最低治理定义；
- 明确哪些必须补；
- 明确哪些可以后补；
- 明确哪些不应该为了“看起来一致”而硬补。

---

## 1. 总原则

一句话：

> **Codex 现在最该补的是“治理定义”，不是“附件数量”。**

因此默认策略应为：
- **共享核心规则**；
- **Codex 保持轻量 target**；
- **只补 target completeness、doctor/ci 判定、项目 instruction 最低口径**；
- **不强行复制 Claude 的 richer runtime assets。**

---

## 2. 必补项

### 2.1 Codex target 完成态定义

必须明确：
- 什么算 Codex user install 完成；
- 什么算 Codex project install 完成；
- 哪些文件是 required；
- 哪些文件是 optional；
- 哪些缺失应视为 fatal，哪些只是 warning。

原因：
- 目前 Codex 是“能装”，但“什么算装好”还不够硬；
- 没有完成态标准，`doctor / ci / status` 对 Codex 的治理口径会长期偏虚。

建议落点：
- `docs/authoring-targets.md`
- 或新增独立 Codex target reference，再从 README / target docs 回挂。

---

### 2.2 Codex 的 doctor / ci 判定标准

必须明确：
- `doctor` 对 Codex user/profile 的最低检查；
- `doctor` 对 Codex project instruction 的最低检查；
- `ci` 对 Codex project file 的合格标准；
- 哪些是 fatal，哪些是 warning。

原因：
- 既然 Codex 是 built-in target，就不该长期停留在“弱检查”状态；
- 治理严肃性应与 Claude 同级，但不要求文件数量相同。

建议落点：
- `src/commands/doctor.js`
- `src/commands/ci.js`
- `docs/authoring-targets.md`

---

### 2.3 Codex project instruction 最低治理口径

必须明确 `templates/codex-project/AGENTS.md` 的最低完成要求，至少覆盖：
- 项目是什么；
- 怎么运行 / 验证；
- 重要路径；
- 当前优先级；
- guardrails / do-not-touch。

原因：
- Codex 当前高度依赖 `AGENTS.md`；
- 如果 project 层过空，target 虽装了，但实际使用仍会很虚。

建议落点：
- `templates/codex-project/AGENTS.md`
- `src/commands/doctor.js`
- `src/commands/ci.js`

---

## 3. 可选补项

### 3.1 Codex target 使用说明页

可补内容：
- Codex 与 Claude 的差异说明；
- 什么时候更适合用 Codex；
- Codex target 的轻量使用方式。

价值：
- 对内部推广有帮助；
- 但不影响 target 最低可用性。

---

### 3.2 Codex target best practices

可补内容：
- 对 Codex 更适合的 instruction 写法；
- 对 shell / edit / verification 的偏好；
- 对 AGENTS 写作风格的建议。

价值：
- 属于体验优化；
- 不属于底线治理定义。

---

### 3.3 Codex completeness quick reference

可补内容：
- 一页式速查：required / optional / intentionally omitted。

价值：
- 方便传播；
- 但可以晚于核心治理定义。

---

## 4. 明确不补项

### 4.1 不补 Claude 式 `settings.json` 镜像

原因：
- 不能为了对齐而伪造承载层；
- 如果 Codex 没有等价机制，补出来只是假完整。

---

### 4.2 不补 Claude 式 hooks / commands / agents 全量镜像

原因：
- Claude user 模板中的 commands / hooks / agents 明显偏 Claude runtime 设计；
- 若 Codex 侧没有真实消费机制，直接复制只会增加维护负担与 target drift。

---

### 4.3 不追求 Claude / Codex 文件树一比一对齐

原因：
- 我们要的是治理效果一致；
- 不是目录长得一样。

---

## 5. 建议执行顺序

### P0
1. 补 Codex 完成态定义
2. 补 doctor / ci 的 Codex 判定口径
3. 补 AGENTS.md 的最低治理标准

### P1
4. 补 Codex target 使用说明页
5. 补 Codex quick reference

### P2
6. 再决定是否需要更深的 Codex-specific runtime 资产

---

## 6. 一句话结论

> **Codex 应补“治理定义”，不应补“为了看起来像 Claude 而增加的附件”。**
