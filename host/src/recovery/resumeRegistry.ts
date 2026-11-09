/**
 * 待注入的精简恢复摘要，按目标会话 id 保存。
 * 摘要只在目标会话的下一次 systemPrompt 组装时注入一次，随后清除。
 */
export class PendingResumeRegistry {
  private readonly pending = new Map<string, string>();

  set(sessionId: string, summary: string): void {
    if (sessionId.length === 0 || summary.length === 0) return;
    this.pending.set(sessionId, summary);
  }

  peek(sessionId: string): string {
    return this.pending.get(sessionId) ?? '';
  }

  consume(sessionId: string): string {
    const summary = this.pending.get(sessionId) ?? '';
    if (summary.length > 0) this.pending.delete(sessionId);
    return summary;
  }

  get size(): number {
    return this.pending.size;
  }

  clear(): void {
    this.pending.clear();
  }
}
