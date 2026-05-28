# 编写 Hook

Hooks 是 `templates/claude-user/hooks/` 中的 shell 脚本，`init` 时复制到 `~/.claude/hooks/`。它们在工具调用前后自动运行 —— 在 Claude Code 之外，作为独立进程执行，可在动作发生前阻止危险操作。

Hooks 在 `templates/claude-user/settings.json` 的 `hooks` 键下注册。

## Hook 如何工作

Claude Code 调用 hook 的方式：
1. 根据 `settings.json` 中的 `matcher` 模式匹配活动工具。
2. 将工具的 JSON 输入通过 stdin 传给 hook。
3. 读取 hook 的退出码：

| 退出码 | 意义 |
|---|---|
| `0` | 允许 — 工具调用正常进行 |
| `2` | 阻止 — Claude Code 取消工具调用；stderr 显示原因 |
| `1` | Hook 错误 — 视为允许，并在会话中发出警告 |

Hook 会在 stdin 接收完整工具输入的 JSON 字符串。它必须解析该 JSON 以检查参数。

## Hook 类型

当前发行版提供四个 hook：

| 文件 | Matcher | 目的 |
|---|---|---|
| `guard-bash.sh` | `Bash` | 阻止一小类高置信度破坏性 shell 模式 |
| `git-commit-gate.sh` | `Bash` | 硬阻止 blanket staging、空提交、秘钥材料、明显垃圾的暂存提交 |
| `docs-governance-watch.sh` | `Bash` | 文档相关提交/推送时的告警型治理监视 |
| `guard-edit.sh` | `Write\|Edit\|MultiEdit` | 阻止对秘密文件、`.git/`、`.ssh/`、`.gnupg/` 的写入 |

这些是安全网，不是主要访问控制 —— `settings.json` 权限是首要门槛。Hooks 用来捕捉那些权限通配符漏掉的模式。有些 hook 是硬阻止的（`guard-bash.sh`、`git-commit-gate.sh`），而面向治理的检查可以是告警型的（`docs-governance-watch.sh`）。

## 编写 Hook

```bash
#!/usr/bin/env bash
set -euo pipefail

input=$(cat)          # 从 stdin 读取完整工具输入 JSON

block() {
  printf 'Blocked by company harness: %s\n' "$1" >&2
  printf 'If intentional, ask the user to run this manually.\n' >&2
  exit 2
}

# inspect $input and call block() if dangerous
case "$input" in
  *'dangerous-pattern'*) block "reason" ;;
esac

exit 0
```

规则：
- 必须 `set -euo pipefail`。hook 意外崩溃会退出 `1`（允许 + 警告），但 fail-safe 更好。
- 使用 `grep`、`case` 或 `jq` 解析 stdin 文本。不要假设工具输入结构超出该工具实际发送的范围。
- `block()` 必须写 stderr —— stdout 会被 Claude Code 忽略。
- 退出 `2` 表示阻止，退出 `0` 表示允许。在没有明确原因时不要用 `2` 返回误报。
- 匹配模式要保守：优先精确字符串或紧凑正则，而不是宽泛通配符。误报会破坏合法工作流。

## 在 settings.json 中注册 Hook

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "$HOME/.claude/hooks/my-guard.sh"
        }
      ]
    }
  ]
}
```

`matcher` 是工具名或以 `|` 分隔的工具列表（例如 `"Write|Edit|MultiEdit"`）。

`PreToolUse` 在工具执行前触发。这是安全防护的正确位置 —— 事后阻止已经太晚。

## 添加 Hook

1. 创建 `templates/claude-user/hooks/<name>.sh` 并使其可执行（`chmod +x`）。
2. 在 `templates/claude-user/settings.json` 的正确 matcher 下注册。
3. 本地测试：
   - 触发阻止模式，确认退出 `2` 且显示清晰错误信息。
   - 触发安全变体，确认退出 `0` 且不干扰。
   - 触发模糊模式，确认你已经做出慎重判断（阻止或允许）。
4. 升级包版本（新 hook 改变安全行为；视为次版本升级）。

## 审查 Hook PR

- **误报率** — 这个模式会误阻哪些合法命令？测试它。
- **漏报** — 这个模式是否遗漏明显变体？例如阻止 `rm -rf /` 但没阻止 `rm -rf /home`。
- **错误消息** — 阻止原因是否足够具体，让用户理解触发原因以及如何规避？
- **与权限的重叠** — 如果 `settings.json` 已经拒绝该模式，hook 是否提供了有意义的防御深度，还是冗余噪声？
- **范围** — 这是否应属于共享 harness，还是项目级别规则？项目级 hook 属于项目自己的 `.claude/settings.json`，而不是这里。

## 不要放进 Hook 的内容

- 业务逻辑或项目特定规则 — 这些应该放在项目级别设置中。
- 已经由 permissions `deny` 列表强制的检查 — 冗余 hook 会增加维护成本，无益。
- 任何有状态操作（写文件、调用外部 API） — hook 必须快速且无副作用。慢 hook 会阻塞所有匹配的工具调用。
