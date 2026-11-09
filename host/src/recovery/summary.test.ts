import { describe, expect, it } from 'vitest';
import type { CheckpointRecord } from '../checkpoint/types.ts';
import { buildRecoverySummary, summarizeArgs, truncateText } from './summary.ts';

function record(summary: string, timestamp = 1): CheckpointRecord {
  return {
    timestamp,
    stepType: 'edit-burst',
    toolName: 'write_file',
    argSummary: summary,
    resultStatus: 'success',
  };
}

describe('summarizeArgs', () => {
  it('keeps the argument summary within 200 characters', () => {
    const summary = summarizeArgs({
      file_path: 'src/very/long/path/component.ts',
      content: '代'.repeat(500),
    });
    expect(Array.from(summary).length).toBeLessThanOrEqual(200);
    expect(summary).toContain('file_path=');
    expect(summary.endsWith('…')).toBe(true);
  });

  it('handles non-object arguments', () => {
    expect(summarizeArgs('npm test')).toBe('npm test');
    expect(summarizeArgs(null)).toBe('');
  });
});

describe('buildRecoverySummary', () => {
  it('returns an empty string when there are no checkpoints', () => {
    expect(buildRecoverySummary([])).toBe('');
  });

  it('uses only the last three checkpoint summaries', () => {
    const records = [record('step-1'), record('step-2'), record('step-3'), record('step-4'), record('step-5')];
    const summary = buildRecoverySummary(records);

    expect(summary).not.toContain('step-1');
    expect(summary).not.toContain('step-2');
    expect(summary).toContain('step-3');
    expect(summary).toContain('step-4');
    expect(summary).toContain('step-5');
    expect(summary.startsWith('上次会话执行到：')).toBe(true);
    expect(summary.endsWith('。用户选择从此处继续。')).toBe(true);
  });

  it('truncates long summaries to 500 characters but keeps the fixed suffix', () => {
    const records = [record('进'.repeat(400)), record('度'.repeat(400)), record('摘'.repeat(400))];
    const summary = buildRecoverySummary(records);

    expect(Array.from(summary).length).toBeLessThanOrEqual(500);
    expect(summary.endsWith('。用户选择从此处继续。')).toBe(true);
    expect(summary).toContain('…');
  });
});

describe('truncateText', () => {
  it('counts unicode code points rather than UTF-16 units', () => {
    const text = '😀'.repeat(10);
    expect(Array.from(truncateText(text, 5)).length).toBe(5);
  });
});
