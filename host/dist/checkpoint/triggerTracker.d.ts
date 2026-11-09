import type { CheckpointRecord } from './types.ts';
export interface ToolObservation {
    readonly sessionId: string;
    readonly name: string;
    readonly args: unknown;
    readonly isError: boolean;
    readonly timestamp: number;
}
/**
 * 检查点触发规则：
 * - 连续 2 次成功的 write/edit 调用 → edit-burst
 * - 1 次成功的 bash 测试命令 → test-pass
 * 失败调用或其它成功调用都会打断 write/edit 的连续计数。
 */
export declare class TriggerTracker {
    private readonly streaks;
    observe(observation: ToolObservation): CheckpointRecord | null;
    streakOf(sessionId: string): number;
    reset(): void;
}
//# sourceMappingURL=triggerTracker.d.ts.map