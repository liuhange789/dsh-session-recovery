import { describe, expect, it } from 'vitest';
import { TriggerTracker, type ToolObservation } from './triggerTracker.ts';

function observation(overrides: Partial<ToolObservation>): ToolObservation {
  return {
    sessionId: 'session-1',
    name: 'write_file',
    args: { file_path: 'src/a.ts' },
    isError: false,
    timestamp: 1,
    ...overrides,
  };
}

describe('TriggerTracker', () => {
  it('does not checkpoint after a single successful edit', () => {
    const tracker = new TriggerTracker();
    expect(tracker.observe(observation({}))).toBeNull();
    expect(tracker.streakOf('session-1')).toBe(1);
  });

  it('checkpoints after two consecutive successful write/edit calls', () => {
    const tracker = new TriggerTracker();
    expect(tracker.observe(observation({ name: 'write_file' }))).toBeNull();

    const record = tracker.observe(observation({ name: 'edit_file', timestamp: 2 }));
    expect(record).not.toBeNull();
    expect(record?.stepType).toBe('edit-burst');
    expect(record?.toolName).toBe('edit_file');
    expect(record?.resultStatus).toBe('success');
    expect(record?.argSummary).toContain('src/a.ts');
    expect(tracker.streakOf('session-1')).toBe(0);
  });

  it('breaks the edit streak on failure or an unrelated tool', () => {
    const tracker = new TriggerTracker();
    tracker.observe(observation({}));
    expect(tracker.observe(observation({ isError: true }))).toBeNull();
    expect(tracker.observe(observation({}))).toBeNull();

    tracker.observe(observation({ name: 'read_file' }));
    expect(tracker.observe(observation({}))).toBeNull();
    expect(tracker.observe(observation({}))?.stepType).toBe('edit-burst');
  });

  it('checkpoints on one successful bash test command', () => {
    const tracker = new TriggerTracker();
    const record = tracker.observe(observation({
      name: 'bash',
      args: { command: 'npm test -- --run' },
    }));

    expect(record?.stepType).toBe('test-pass');
    expect(record?.argSummary).toContain('npm test');
  });

  it('does not checkpoint on non-test shell commands or failed tests', () => {
    const tracker = new TriggerTracker();
    expect(tracker.observe(observation({ name: 'bash', args: { command: 'ls -la' } }))).toBeNull();
    expect(tracker.observe(observation({
      name: 'bash',
      args: { command: 'npx vitest run' },
      isError: true,
    }))).toBeNull();
  });

  it('supports common test runners', () => {
    const commands = ['pytest -q', 'go test ./...', 'cargo test', 'pnpm run test', 'yarn jest'];
    for (const command of commands) {
      const tracker = new TriggerTracker();
      expect(tracker.observe(observation({ name: 'shell', args: { command } }))?.stepType)
        .toBe('test-pass');
    }
  });
});
