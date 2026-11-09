import { scanRecovery } from "./scanner.js";
import { buildRecoverySummary } from "./summary.js";
export const ERR_NO_CHECKPOINTS = 'NO_CHECKPOINTS';
export const ERR_NO_SESSIONS_SERVICE = 'NO_SESSIONS_SERVICE';
export class RecoveryService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    now() {
        return this.deps.now ? this.deps.now() : Date.now();
    }
    async getCandidates() {
        return scanRecovery(this.deps.store, this.now());
    }
    /**
     * 观察一次工具结果；满足触发规则时写入检查点并返回它。
     * 返回值只用于日志和测试，调用方不需要知道写入了哪一条。
     */
    async observeToolResult(exec, result) {
        const sessionId = exec.agent?.session?.id ?? '';
        if (sessionId.length === 0)
            return null;
        const record = this.deps.tracker.observe({
            sessionId,
            name: exec.name ?? '',
            args: exec.arguments,
            isError: result.isError === true,
            timestamp: this.now(),
        });
        if (record === null)
            return null;
        await this.deps.store.append(sessionId, record);
        return record;
    }
    /**
     * 从来源会话恢复：新建一个空会话，把最后 3 个检查点的精简摘要登记为
     * 新会话下一次 systemPrompt 组装时的注入内容，然后把来源会话标记完成，
     * 避免它继续出现在候选列表里。
     */
    async resume(sessionId) {
        const records = await this.deps.store.read(sessionId);
        const summary = buildRecoverySummary(records);
        if (summary.length === 0) {
            return { summary: '', newSessionId: null, errorCode: ERR_NO_CHECKPOINTS };
        }
        if (!this.deps.sessions) {
            return { summary, newSessionId: null, errorCode: ERR_NO_SESSIONS_SERVICE };
        }
        const session = this.deps.sessions.create();
        this.deps.pending.set(session.id, summary);
        await this.deps.store.markCompleted(sessionId, this.now());
        return { summary, newSessionId: session.id, errorCode: null };
    }
    async dismiss(sessionId) {
        if (sessionId.length === 0)
            return false;
        await this.deps.store.markCompleted(sessionId, this.now());
        return true;
    }
}
//# sourceMappingURL=recoveryService.js.map