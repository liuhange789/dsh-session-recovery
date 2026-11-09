# 验证记录

记录时间：2026-11-09

## 已真实执行

### 1. 单元与集成测试

```text
npm run typecheck   host 通过
npm test            7 个文件 / 32 项全部通过
npm run build       host/dist 生成成功
node -e "import('./host/dist/index.js')"
                    exports: apply,inject,name,setup
```

测试不是只写文件，均由 vitest 实际执行：

- `triggerTracker.test.ts`：连续 2 次编辑触发、失败/其它工具打断、5 种测试命令识别
- `checkpointStore.test.ts`：60 条写入只保留最新 50 条、12 路并发写入不丢行、损坏行跳过、完成标记
- `summary.test.ts`：200 字参数摘要、500 字恢复摘要、Unicode 截断、固定结尾保留
- `freshness.test.ts`：24 小时边界、未来时间容差
- `scanner.test.ts`：新旧会话混合、已完成会话排除、最后 3 条摘要
- `setup.test.ts`：模拟两次编辑 + 一次测试 → 落盘两条检查点 → `list` 返回候选 → `resume` 创建新会话 → 摘要只注入一次 → 来源会话不再出现
- `recoveryPaths.test.ts`：`$DSH_RECOVERY_DIR` > `$DSH_HOME` > `~/.dsh` 优先级，路径清洗

### 2. 中断/重启的进程级验证

用临时 `$DSH_RECOVERY_DIR` 走完整链路：

1. 写入两条检查点（`edit-burst`、`test-pass`）
2. 丢弃进程内状态，重新 `apply()` 模拟 DSH 重开
3. 启动扫描只返回 24 小时内、未完成的会话
4. `resume` 生成新会话 id，systemPrompt 第一次组装返回摘要、第二次返回空
5. 摘要长度实测 ≤500 字，内容只含最后 3 条 `argSummary`

这是一次真实的磁盘读写与重启扫描，但宿主上下文是测试用的 Cordis 风格 mock，不是 DSH Web UI。

## 未能执行

**真实 DSH Web 会话里的恢复卡片端到端演示未完成。** 具体原因：

1. 本机 PATH 上没有 `dsh` 可执行文件；`$DSH_HOME/profiles` 里只有已安装的包，没有启动器，无法从命令行拉起 Web 会话。
2. 即使拉起 Web，本机安装的 `@deepseek-ai/dsh-cordis-client-runner` 客户端插件 API 只有 UI slots 与 `ctx.sessions`，没有宿主插件 → 客户端的数据通道；检查点在宿主文件系统上，卡片拿不到数据。
3. 因此本版本删除卡片组件，恢复入口改为宿主侧 `session_recovery` 工具，并在 README 中写明限制。

以上都是环境/接口事实，不是用 mock 掩盖的结论。
