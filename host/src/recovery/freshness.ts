import { FRESHNESS_WINDOW_MS, type CheckpointRecord } from '../checkpoint/types.ts';

const FUTURE_TOLERANCE_MS = 60_000;

/**
 * 检查点新鲜度：参考 StaleGuard 的超时检测思路——时间戳必须落在
 * [now - window, now + 容差] 内，超出窗口或明显来自未来的记录都视为不新鲜。
 */
export function isFresh(
  timestamp: number,
  now: number,
  windowMs = FRESHNESS_WINDOW_MS,
  futureToleranceMs = FUTURE_TOLERANCE_MS,
): boolean {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return false;
  if (timestamp > now + futureToleranceMs) return false;
  return now - timestamp <= windowMs;
}

export function filterFresh(
  records: readonly CheckpointRecord[],
  now: number,
  windowMs = FRESHNESS_WINDOW_MS,
): CheckpointRecord[] {
  return records.filter((record) => isFresh(record.timestamp, now, windowMs));
}
