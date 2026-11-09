/** 检查点最多保留条数（滑动淘汰）。 */
export const MAX_CHECKPOINTS = 50;

/** 单条 argSummary 的最大字符数。 */
export const ARG_SUMMARY_LIMIT = 200;

/** 恢复摘要的最大字符数。 */
export const SUMMARY_LIMIT = 500;

/** 未完成会话的默认新鲜度窗口：24 小时。 */
export const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 恢复摘要引用的检查点条数。 */
export const SUMMARY_CHECKPOINT_COUNT = 3;

export type CheckpointStepType = 'edit-burst' | 'test-pass';

export type CheckpointResultStatus = 'success' | 'failure';

export interface CheckpointRecord {
  readonly timestamp: number;
  readonly stepType: CheckpointStepType;
  readonly toolName: string;
  readonly argSummary: string;
  readonly resultStatus: CheckpointResultStatus;
}

export interface SessionCheckpoints {
  readonly sessionId: string;
  readonly records: readonly CheckpointRecord[];
}

export interface RecoveryCandidate {
  readonly sessionId: string;
  readonly steps: number;
  readonly lastTimestamp: number;
  readonly lastStepType: CheckpointStepType;
  readonly lastToolName: string;
  readonly lastSummaries: readonly string[];
}
