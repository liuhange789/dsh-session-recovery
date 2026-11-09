import type { DshHostContext } from './types/dshContext.ts';
export declare const name = "@liuhange/dsh-session-recovery";
/**
 * `sessions` 用于恢复时创建新会话；`systemPrompt` 用于注入摘要；
 * `tools` 用于监听工具结果并注册 `session_recovery` 工具。
 */
export declare const inject: readonly ["tools", "systemPrompt", "sessions"];
/**
 * 插件入口：
 * 1. 监听 tools/post-execute，按规则写入 JSONL 检查点；
 * 2. 启动时扫描 recovery 目录，把 24 小时内未完成会话写进日志；
 * 3. 注册 systemPrompt 片段，恢复会话时注入不超过 500 字的精简摘要；
 * 4. 注册 session_recovery 工具，让模型可以列出 / 继续 / 忽略候选会话。
 */
export declare function apply(ctx: DshHostContext): Promise<void>;
/**
 * 本机既有插件的 Host 入口使用 `setup`，DSH 的 cordis 加载器使用 `apply`。
 * 两个名字指向同一实现，避免因加载器版本不同而静默不激活。
 */
export declare const setup: typeof apply;
//# sourceMappingURL=index.d.ts.map