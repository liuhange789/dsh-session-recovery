import { FRESHNESS_WINDOW_MS } from "../checkpoint/types.js";
const FUTURE_TOLERANCE_MS = 60_000;
/**
 * 检查点新鲜度：参考 StaleGuard 的超时检测思路——时间戳必须落在
 * [now - window, now + 容差] 内，超出窗口或明显来自未来的记录都视为不新鲜。
 */
export function isFresh(timestamp, now, windowMs = FRESHNESS_WINDOW_MS, futureToleranceMs = FUTURE_TOLERANCE_MS) {
    if (!Number.isFinite(timestamp) || !Number.isFinite(now))
        return false;
    if (timestamp > now + futureToleranceMs)
        return false;
    return now - timestamp <= windowMs;
}
export function filterFresh(records, now, windowMs = FRESHNESS_WINDOW_MS) {
    return records.filter((record) => isFresh(record.timestamp, now, windowMs));
}
//# sourceMappingURL=freshness.js.map