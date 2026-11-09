/**
 * 待注入的精简恢复摘要，按目标会话 id 保存。
 * 摘要只在目标会话的下一次 systemPrompt 组装时注入一次，随后清除。
 */
export declare class PendingResumeRegistry {
    private readonly pending;
    set(sessionId: string, summary: string): void;
    peek(sessionId: string): string;
    consume(sessionId: string): string;
    get size(): number;
    clear(): void;
}
//# sourceMappingURL=resumeRegistry.d.ts.map