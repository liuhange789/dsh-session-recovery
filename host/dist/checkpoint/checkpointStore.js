import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_CHECKPOINTS, } from "./types.js";
import { checkpointFilePath, completedMarkerPath } from "./recoveryPaths.js";
const STEP_TYPES = ['edit-burst', 'test-pass'];
const RESULT_STATUSES = ['success', 'failure'];
function isCheckpointRecord(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return (typeof record.timestamp === 'number'
        && Number.isFinite(record.timestamp)
        && typeof record.toolName === 'string'
        && typeof record.argSummary === 'string'
        && STEP_TYPES.includes(record.stepType)
        && RESULT_STATUSES.includes(record.resultStatus));
}
/**
 * JSONL 检查点存储：每条记录一行，读取时跳过损坏行，写入按会话串行化，
 * 通过临时文件 + rename 保证单文件写入不会留下半行。
 */
export class CheckpointStore {
    dir;
    maxRecords;
    queues = new Map();
    constructor(dir, maxRecords = MAX_CHECKPOINTS) {
        this.dir = dir;
        this.maxRecords = Math.max(1, maxRecords);
    }
    get directory() {
        return this.dir;
    }
    async append(sessionId, record) {
        const previous = this.queues.get(sessionId) ?? Promise.resolve();
        const run = previous.then(() => this.appendNow(sessionId, record));
        this.queues.set(sessionId, run.then(() => undefined, () => undefined));
        return run;
    }
    async read(sessionId) {
        let raw;
        try {
            raw = await readFile(checkpointFilePath(this.dir, sessionId), 'utf8');
        }
        catch {
            return [];
        }
        const records = [];
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed.length === 0)
                continue;
            try {
                const parsed = JSON.parse(trimmed);
                if (isCheckpointRecord(parsed))
                    records.push(parsed);
            }
            catch {
                // 损坏行直接跳过，不能影响其余检查点。
            }
        }
        return records;
    }
    async listSessions() {
        let entries;
        try {
            entries = await readdir(this.dir);
        }
        catch {
            return [];
        }
        const sessions = [];
        for (const entry of entries) {
            if (!entry.endsWith('.jsonl'))
                continue;
            const sessionId = entry.slice(0, -'.jsonl'.length);
            const records = await this.read(sessionId);
            if (records.length > 0)
                sessions.push({ sessionId, records });
        }
        return sessions;
    }
    async markCompleted(sessionId, completedAt = Date.now()) {
        await mkdir(this.dir, { recursive: true });
        await writeFile(completedMarkerPath(this.dir, sessionId), JSON.stringify({ sessionId, completedAt }), 'utf8');
    }
    async isCompleted(sessionId) {
        try {
            await access(completedMarkerPath(this.dir, sessionId));
            return true;
        }
        catch {
            return false;
        }
    }
    async appendNow(sessionId, record) {
        const existing = await this.read(sessionId);
        const next = [...existing, record].slice(-this.maxRecords);
        await mkdir(this.dir, { recursive: true });
        const target = checkpointFilePath(this.dir, sessionId);
        const temp = path.join(this.dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
        await writeFile(temp, next.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');
        await rename(temp, target);
    }
}
//# sourceMappingURL=checkpointStore.js.map