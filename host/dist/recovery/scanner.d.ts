import type { CheckpointStore } from '../checkpoint/checkpointStore.ts';
import { type RecoveryCandidate } from '../checkpoint/types.ts';
/**
 * 扫描 recovery 目录：只返回 24 小时窗口内仍有新鲜检查点、且尚未标记完成的会话，
 * 最近更新的排在前面。
 */
export declare function scanRecovery(store: CheckpointStore, now: number, windowMs?: number): Promise<RecoveryCandidate[]>;
//# sourceMappingURL=scanner.d.ts.map