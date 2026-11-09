import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckpointStore } from './checkpointStore.ts';
import type { CheckpointRecord } from './types.ts';

const tempDirs: string[] = [];

async function makeDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-recovery-store-'));
  tempDirs.push(dir);
  return dir;
}

function record(index: number): CheckpointRecord {
  return {
    timestamp: index,
    stepType: 'edit-burst',
    toolName: 'write_file',
    argSummary: `step-${index}`,
    resultStatus: 'success',
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('CheckpointStore', () => {
  it('keeps only the newest 50 records with sliding eviction', async () => {
    const store = new CheckpointStore(await makeDir());
    for (let index = 0; index < 60; index += 1) {
      await store.append('session-1', record(index));
    }

    const records = await store.read('session-1');
    expect(records).toHaveLength(50);
    expect(records[0].argSummary).toBe('step-10');
    expect(records[49].argSummary).toBe('step-59');
  });

  it('serializes concurrent appends for the same session', async () => {
    const store = new CheckpointStore(await makeDir());
    await Promise.all(
      Array.from({ length: 12 }, (_, index) => store.append('session-2', record(index))),
    );

    const records = await store.read('session-2');
    expect(records).toHaveLength(12);
    expect(new Set(records.map((item) => item.argSummary)).size).toBe(12);
  });

  it('skips malformed lines instead of failing the whole file', async () => {
    const dir = await makeDir();
    const store = new CheckpointStore(dir);
    await store.append('session-3', record(1));
    const file = path.join(dir, 'session-3.jsonl');
    const original = await readFile(file, 'utf8');
    await writeFile(file, `${original}not-json\n{"timestamp":"bad"}\n`, 'utf8');

    const records = await store.read('session-3');
    expect(records).toHaveLength(1);
    expect(records[0].argSummary).toBe('step-1');
  });

  it('persists the completed marker', async () => {
    const store = new CheckpointStore(await makeDir());
    await store.append('session-4', record(1));
    expect(await store.isCompleted('session-4')).toBe(false);

    await store.markCompleted('session-4', 123);
    expect(await store.isCompleted('session-4')).toBe(true);
  });
});
