# @liuhange/dsh-session-recovery

会话中断后的断点续跑插件。它不做全量会话恢复，只恢复关键事实：在关键执行节点把轻量检查点写入本地 JSONL；DSH 下次启动时扫描未完成会话；恢复时新建会话，并注入最后 3 个检查点的精简摘要（≤500 字）。

## 它解决什么问题

长任务跑到一半关掉 DSH，重开后模型对“刚才做到哪”一无所知。本插件在工具调用成功时记录少量关键事实，恢复时只给模型三句进度，而不是灌回整段历史。

## 检查点规则

| 触发条件 | stepType |
| --- | --- |
| 连续 2 次成功的 `write` / `edit` 类工具调用 | `edit-burst` |
| 1 次成功的 bash 测试命令（npm/pnpm/yarn/bun test、vitest、jest、pytest、go test、cargo test、mvn test、dotnet test 等） | `test-pass` |

失败调用或其它成功调用会打断 `write`/`edit` 的连续计数。这样判定是因为：一次孤立编辑不足以说明进度，而测试通过或连续落盘才是“可以从此处继续”的稳定信号。

## 检查点存在哪

优先级从高到低：

1. `$DSH_RECOVERY_DIR`（测试/运维显式覆盖）
2. `$DSH_HOME/profiles/web/recovery`（DSH 宿主给定的 home）
3. `~/.dsh/profiles/web/recovery`（DSH 默认布局）

代码不写死任何机器路径；`$DSH_HOME` 与 DSH 自身的 `@deepseek-ai/dsh-home-paths` 规则一致。

文件名为 `{sessionId}.jsonl`，每行一条：

```json
{
  "timestamp": 1762668000000,
  "stepType": "edit-burst",
  "toolName": "edit_file",
  "argSummary": "file_path=src/a.ts | content=...",
  "resultStatus": "success"
}
```

- `argSummary` 最多 200 字，超长按字符截断并追加 `…`
- 每个会话最多 50 条，写入时滑动淘汰最旧记录
- 写入按会话串行化，并用临时文件 + rename，避免中断留下半行
- 损坏的 JSONL 行会被跳过，不影响其余检查点
- 忽略某个会话时写入 `{sessionId}.completed.json`，之后的扫描不再提示它

## 恢复流程

1. DSH 启动时扫描 recovery 目录，找出最近 24 小时内仍有新鲜检查点、且未标记完成的会话，并写入启动日志
2. 模型调用 `session_recovery` 工具 `{ "action": "list" }` 查看候选
3. `{ "action": "resume", "sessionId": "..." }`：
   - 宿主新建一个空会话
   - 把最后 3 个检查点的 `argSummary` 组装成 `上次会话执行到：…。用户选择从此处继续。`
   - 摘要只在新会话下一次 systemPrompt 组装时注入一次，之后自动清除
   - 来源会话标记完成
4. `{ "action": "dismiss", "sessionId": "..." }`：不恢复，直接标记完成

摘要总长度不超过 500 字；超长时截断正文但保留固定结尾。

## 安装与启用

```bash
npm install @liuhange/dsh-session-recovery
```

包内已声明 bundle：

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

`cordis.patch.yml` 只有一条合法插入：

```yaml
- insert:
    - id: "@liuhange/dsh-session-recovery"
      name: "@liuhange/dsh-session-recovery"
```

两种启用方式（任选其一）：

1. 把包加进 `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles`；
2. 或在 `$DSH_HOME/profiles/web/cordis.patch.yml` 里追加上面的 `insert` 条目。

重启 DSH 即生效。卸载：从 bundles / patch 中移除该条目并重启。

## 如何验证生效

1. 在一个会话里连续让模型成功执行两次 `write`/`edit`，或跑一次 `npm test`
2. 查看 `$DSH_HOME/profiles/web/recovery/`（默认 `~/.dsh/profiles/web/recovery/`）下是否出现 `{sessionId}.jsonl`，且不超过 50 行
3. 重启 DSH，看启动日志里的 `session-recovery: startup scan complete`，`candidates` 应包含该会话
4. 让模型调用 `session_recovery` 的 `list` / `resume`，确认返回的摘要只包含最后 3 条进度、且长度 ≤500

## 已知限制：本版本没有会话列表卡片

这一点必须如实说明，不能用假接口掩盖：

- 本机安装的 `@deepseek-ai/dsh-cordis-client-runner` 中，客户端插件拿到的是 Cordis 客户端 `ctx`（UI slots、`ctx.sessions` 等），**没有**读取宿主插件本地文件或调用宿主插件方法的通道。
- 检查点数据在宿主文件系统上，客户端无法读取；`ctx.sessions` 只能读会话列表，不能读插件私有数据。
- 因此当前版本把恢复入口做成宿主侧 `session_recovery` 工具，而不是会话列表顶部的卡片。卡片的视觉与交互代码已删除，避免发布一个永远拿不到数据的假组件。

如果后续 DSH 版本提供宿主插件 → 客户端的数据通道或会话列表挂载点，可以在不改动检查点与摘要逻辑的前提下补一个纯展示层。

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
npm run pack:check
```

测试覆盖：触发规则与连续计数打断、JSONL 损坏行、50 条滑动淘汰、并发写入、200/500 字截断、24 小时新鲜度、启动扫描、恢复摘要只注入一次、工具注册形状（`schema` 对象、`render` 函数、`execute` 返回对象）、路径优先级。

## 真实验证记录

见 [VERIFICATION.md](./VERIFICATION.md)。

## License

MIT © liuhange789
