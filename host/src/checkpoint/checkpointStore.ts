import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_CHECKPOINTS,
  type CheckpointRecord,
  type CheckpointResultStatus,
  type CheckpointStepType,
  type SessionCheckpoints,
} from './types.ts';
import { checkpointFilePath, completedMarkerPath } from './recoveryPaths.ts';

const STEP_TYPES: readonly CheckpointStepType[] = ['edit-burst', 'test-pass'];
const RESULT_STATUSES: readonly CheckpointResultStatus[] = ['success', 'failure'];

function isCheckpointRecord(value: unknown): value is CheckpointRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.timestamp === 'number'
    && Number.isFinite(record.timestamp)
    && typeof record.toolName === 'string'
    && typeof record.argSummary === 'string'
    && STEP_TYPES.includes(record.stepType as CheckpointStepType)
    && RESULT_STATUSES.includes(record.resultStatus as CheckpointResultStatus)
  );
}

/**
 * JSONL 检查点存储：每条记录一行，读取时跳过损坏行，写入按会话串行化，
 * 通过临时文件 + rename 保证单文件写入不会留下半行。
 */
export class CheckpointStore {
  private readonly dir: string;
  private readonly maxRecords: number;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(dir: string, maxRecords = MAX_CHECKPOINTS) {
    this.dir = dir;
    this.maxRecords = Math.max(1, maxRecords);
  }

  get directory(): string {
    return this.dir;
  }

  async append(sessionId: string, record: CheckpointRecord): Promise<void> {
    const previous = this.queues.get(sessionId) ?? Promise.resolve();
    const run = previous.then(() => this.appendNow(sessionId, record));
    this.queues.set(sessionId, run.then(() => undefined, () => undefined));
    return run;
  }

  async read(sessionId: string): Promise<CheckpointRecord[]> {
    let raw: string;
    try {
      raw = await readFile(checkpointFilePath(this.dir, sessionId), 'utf8');
    } catch {
      return [];
    }
    const records: CheckpointRecord[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isCheckpointRecord(parsed)) records.push(parsed);
      } catch {
        // 损坏行直接跳过，不能影响其余检查点。
      }
    }
    return records;
  }

  async listSessions(): Promise<SessionCheckpoints[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      return [];
    }
    const sessions: SessionCheckpoints[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;
      const sessionId = entry.slice(0, -'.jsonl'.length);
      const records = await this.read(sessionId);
      if (records.length > 0) sessions.push({ sessionId, records });
    }
    return sessions;
  }

  async markCompleted(sessionId: string, completedAt = Date.now()): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      completedMarkerPath(this.dir, sessionId),
      JSON.stringify({ sessionId, completedAt }),
      'utf8',
    );
  }

  async isCompleted(sessionId: string): Promise<boolean> {
    try {
      await access(completedMarkerPath(this.dir, sessionId));
      return true;
    } catch {
      return false;
    }
  }

  private async appendNow(sessionId: string, record: CheckpointRecord): Promise<void> {
    const existing = await this.read(sessionId);
    const next = [...existing, record].slice(-this.maxRecords);
    await mkdir(this.dir, { recursive: true });
    const target = checkpointFilePath(this.dir, sessionId);
    const temp = path.join(this.dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
    await writeFile(temp, next.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');
    await rename(temp, target);
  }
}
