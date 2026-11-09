import { describe, expect, it } from 'vitest';
import type { CheckpointRecord } from '../checkpoint/types.ts';
import { FRESHNESS_WINDOW_MS } from '../checkpoint/types.ts';
import { filterFresh, isFresh } from './freshness.ts';

const NOW = 1_800_000_000_000;

function record(timestamp: number): CheckpointRecord {
  return {
    timestamp,
    stepType: 'test-pass',
    toolName: 'bash',
    argSummary: 'npm test',
    resultStatus: 'success',
  };
}

describe('isFresh', () => {
  it('accepts checkpoints inside the 24 hour window', () => {
    expect(isFresh(NOW - FRESHNESS_WINDOW_MS, NOW)).toBe(true);
    expect(isFresh(NOW - 1_000, NOW)).toBe(true);
  });

  it('rejects checkpoints older than 24 hours', () => {
    expect(isFresh(NOW - FRESHNESS_WINDOW_MS - 1, NOW)).toBe(false);
  });

  it('tolerates small clock skew but rejects clearly future timestamps', () => {
    expect(isFresh(NOW + 30_000, NOW)).toBe(true);
    expect(isFresh(NOW + 120_000, NOW)).toBe(false);
    expect(isFresh(Number.NaN, NOW)).toBe(false);
  });

  it('filters a mixed record list', () => {
    const fresh = filterFresh(
      [record(NOW - 1_000), record(NOW - FRESHNESS_WINDOW_MS - 1), record(NOW - 5_000)],
      NOW,
    );
    expect(fresh.map((item) => item.timestamp)).toEqual([NOW - 1_000, NOW - 5_000]);
  });
});
