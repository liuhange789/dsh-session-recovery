/**
 * 解析 DSH home。优先使用宿主注入的 `$DSH_HOME`，这是 DSH 自己
 * `@deepseek-ai/dsh-home-paths` 也遵循的覆盖规则；没有覆盖时才回退到
 * 操作系统 home 下的 `.dsh`。这里不写死任何用户目录。
 */
export declare function dshHome(): string;
/**
 * 检查点目录优先级：
 * 1. `$DSH_RECOVERY_DIR` —— 仅用于测试和运维显式覆盖；
 * 2. `$DSH_HOME/profiles/web/recovery` —— 宿主给定的 home；
 * 3. `~/.dsh/profiles/web/recovery` —— DSH 默认布局。
 */
export declare function defaultRecoveryDir(): string;
/** 把会话 id 映射成安全的文件名片段，避免路径穿越与非法字符。 */
export declare function sanitizeSessionId(sessionId: string): string;
export declare function checkpointFilePath(dir: string, sessionId: string): string;
export declare function completedMarkerPath(dir: string, sessionId: string): string;
//# sourceMappingURL=recoveryPaths.d.ts.map