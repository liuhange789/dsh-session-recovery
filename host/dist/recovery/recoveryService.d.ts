import type { CheckpointStore } from '../checkpoint/checkpointStore.ts';
import type { TriggerTracker } from '../checkpoint/triggerTracker.ts';
import type { CheckpointRecord, RecoveryCandidate } from '../checkpoint/types.ts';
import type { DshSessionsService, DshToolExecution, DshToolResult } from '../types/dshContext.ts';
import type { PendingResumeRegistry } from './resumeRegistry.ts';
export declare const ERR_NO_CHECKPOINTS = "NO_CHECKPOINTS";
export declare const ERR_NO_SESSIONS_SERVICE = "NO_SESSIONS_SERVICE";
export interface ResumeResult {
    readonly summary: string;
    readonly newSessionId: string | null;
    readonly errorCode: string | null;
}
export interface RecoveryServiceDeps {
    readonly store: CheckpointStore;
    readonly tracker: TriggerTracker;
    readonly pending: PendingResumeRegistry;
    readonly sessions?: DshSessionsService;
    readonly now?: () => number;
}
export declare class RecoveryService {
    private readonly deps;
    constructor(deps: RecoveryServiceDeps);
    private now;
    getCandidates(): Promise<RecoveryCandidate[]>;
    /**
     * 观察一次工具结果；满足触发规则时写入检查点并返回它。
     * 返回值只用于日志和测试，调用方不需要知道写入了哪一条。
     */
    observeToolResult(exec: DshToolExecution, result: DshToolResult): Promise<CheckpointRecord | null>;
    /**
     * 从来源会话恢复：新建一个空会话，把最后 3 个检查点的精简摘要登记为
     * 新会话下一次 systemPrompt 组装时的注入内容，然后把来源会话标记完成，
     * 避免它继续出现在候选列表里。
     */
    resume(sessionId: string): Promise<ResumeResult>;
    dismiss(sessionId: string): Promise<boolean>;
}
//# sourceMappingURL=recoveryService.d.ts.map