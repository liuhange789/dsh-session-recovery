import { type CheckpointRecord, type SessionCheckpoints } from './types.ts';
/**
 * JSONL 检查点存储：每条记录一行，读取时跳过损坏行，写入按会话串行化，
 * 通过临时文件 + rename 保证单文件写入不会留下半行。
 */
export declare class CheckpointStore {
    private readonly dir;
    private readonly maxRecords;
    private readonly queues;
    constructor(dir: string, maxRecords?: number);
    get directory(): string;
    append(sessionId: string, record: CheckpointRecord): Promise<void>;
    read(sessionId: string): Promise<CheckpointRecord[]>;
    listSessions(): Promise<SessionCheckpoints[]>;
    markCompleted(sessionId: string, completedAt?: number): Promise<void>;
    isCompleted(sessionId: string): Promise<boolean>;
    private appendNow;
}
//# sourceMappingURL=checkpointStore.d.ts.map