import { type CheckpointRecord } from '../checkpoint/types.ts';
/**
 * 检查点新鲜度：参考 StaleGuard 的超时检测思路——时间戳必须落在
 * [now - window, now + 容差] 内，超出窗口或明显来自未来的记录都视为不新鲜。
 */
export declare function isFresh(timestamp: number, now: number, windowMs?: number, futureToleranceMs?: number): boolean;
export declare function filterFresh(records: readonly CheckpointRecord[], now: number, windowMs?: number): CheckpointRecord[];
//# sourceMappingURL=freshness.d.ts.map