import { FRESHNESS_WINDOW_MS, SUMMARY_CHECKPOINT_COUNT, } from "../checkpoint/types.js";
import { filterFresh } from "./freshness.js";
/**
 * 扫描 recovery 目录：只返回 24 小时窗口内仍有新鲜检查点、且尚未标记完成的会话，
 * 最近更新的排在前面。
 */
export async function scanRecovery(store, now, windowMs = FRESHNESS_WINDOW_MS) {
    const sessions = await store.listSessions();
    const candidates = [];
    for (const session of sessions) {
        if (await store.isCompleted(session.sessionId))
            continue;
        const fresh = filterFresh(session.records, now, windowMs);
        if (fresh.length === 0)
            continue;
        const last = fresh[fresh.length - 1];
        candidates.push({
            sessionId: session.sessionId,
            steps: fresh.length,
            lastTimestamp: last.timestamp,
            lastStepType: last.stepType,
            lastToolName: last.toolName,
            lastSummaries: fresh
                .slice(-SUMMARY_CHECKPOINT_COUNT)
                .map((record) => record.argSummary)
                .filter((summary) => summary.length > 0),
        });
    }
    candidates.sort((left, right) => right.lastTimestamp - left.lastTimestamp);
    return candidates;
}
//# sourceMappingURL=scanner.js.map