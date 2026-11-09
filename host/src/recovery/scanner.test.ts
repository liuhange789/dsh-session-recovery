import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckpointStore } from '../checkpoint/checkpointStore.ts';
import { FRESHNESS_WINDOW_MS, type CheckpointRecord } from '../checkpoint/types.ts';
import { scanRecovery } from './scanner.ts';

const NOW = 1_800_000_000_000;
const tempDirs: string[] = [];

async function makeStore(): Promise<CheckpointStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-recovery-scan-'));
  tempDirs.push(dir);
  return new CheckpointStore(dir);
}

function record(summary: string, timestamp: number): CheckpointRecord {
  return {
    timestamp,
    stepType: 'edit-burst',
    toolName: 'write_file',
    argSummary: summary,
    resultStatus: 'success',
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('scanRecovery', () => {
  it('returns fresh, incomplete sessions sorted by recency', async () => {
    const store = await makeStore();
    await store.append('older', record('older-step', NOW - 3 * 60 * 60 * 1000));
    await store.append('newer', record('newer-step', NOW - 60 * 1000));

    const candidates = await scanRecovery(store, NOW);
    expect(candidates.map((item) => item.sessionId)).toEqual(['newer', 'older']);
    expect(candidates[0].steps).toBe(1);
    expect(candidates[0].lastSummaries).toEqual(['newer-step']);
  });

  it('filters sessions whose checkpoints are older than 24 hours', async () => {
    const store = await makeStore();
    await store.append('stale', record('stale-step', NOW - FRESHNESS_WINDOW_MS - 1));

    expect(await scanRecovery(store, NOW)).toEqual([]);
  });

  it('excludes completed sessions', async () => {
    const store = await makeStore();
    await store.append('done', record('done-step', NOW - 1_000));
    await store.markCompleted('done', NOW);

    expect(await scanRecovery(store, NOW)).toEqual([]);
  });

  it('caps lastSummaries at the three most recent checkpoints', async () => {
    const store = await makeStore();
    for (let index = 0; index < 5; index += 1) {
      await store.append('many', record(`step-${index}`, NOW - 10_000 + index));
    }

    const [candidate] = await scanRecovery(store, NOW);
    expect(candidate.steps).toBe(5);
    expect(candidate.lastSummaries).toEqual(['step-2', 'step-3', 'step-4']);
  });
});
