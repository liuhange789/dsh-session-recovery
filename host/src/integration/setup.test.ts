import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, inject, setup } from '../index.ts';
import { CheckpointStore } from '../checkpoint/checkpointStore.ts';
import type { CheckpointRecord } from '../checkpoint/types.ts';
import type {
  DshHostContext,
  DshPromptSection,
  DshToolExecution,
  DshToolResult,
  Disposer,
} from '../types/dshContext.ts';

interface RegisteredTool {
  name: string;
  output: {
    schema: Record<string, unknown>;
    render: (args: unknown, value: unknown) => unknown[];
  };
  execute: (args: unknown, exec: DshToolExecution) => Promise<Record<string, unknown>>;
}

interface LogEntry {
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

interface MockContext extends DshHostContext {
  handlers: Map<string, (...args: unknown[]) => unknown>;
  registered: unknown[];
  promptSection: DshPromptSection | null;
  logs: LogEntry[];
}

function createMockContext(): MockContext {
  let sessionIndex = 0;
  const context: MockContext = {
    handlers: new Map(),
    registered: [],
    promptSection: null,
    logs: [],
    inject,
    on(name, handler) {
      context.handlers.set(name, handler);
      return (() => undefined) as Disposer;
    },
    effect<T>(fn: () => Disposer | Promise<Disposer>): T {
      void fn();
      return undefined as T;
    },
    log(level, message, fields) {
      context.logs.push({ level, message, fields });
    },
    sessions: {
      create() {
        sessionIndex += 1;
        return { id: `new-session-${sessionIndex}` };
      },
    },
    tools: {
      register(tool) {
        context.registered.push(tool);
        return (() => undefined) as Disposer;
      },
    },
    systemPrompt: {
      section(section) {
        context.promptSection = section;
        return (() => undefined) as Disposer;
      },
    },
  };
  return context;
}

const tempDirs: string[] = [];
let originalRecoveryDir: string | undefined;

async function makeRecoveryDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-recovery-int-'));
  tempDirs.push(dir);
  return dir;
}

function record(timestamp: number): CheckpointRecord {
  return {
    timestamp,
    stepType: 'test-pass',
    toolName: 'bash',
    argSummary: 'npm test',
    resultStatus: 'success',
  };
}

beforeEach(() => {
  originalRecoveryDir = process.env.DSH_RECOVERY_DIR;
});

afterEach(async () => {
  if (originalRecoveryDir === undefined) {
    delete process.env.DSH_RECOVERY_DIR;
  } else {
    process.env.DSH_RECOVERY_DIR = originalRecoveryDir;
  }
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('session-recovery plugin', () => {
  it('exports both loader entry names and standard inject services', () => {
    expect(setup).toBe(apply);
    expect(inject).toEqual(['tools', 'systemPrompt', 'sessions']);
  });

  it('writes checkpoints, lists them, and injects a concise summary on resume', async () => {
    const dir = await makeRecoveryDir();
    process.env.DSH_RECOVERY_DIR = dir;
    const ctx = createMockContext();
    await apply(ctx);

    const postExecute = ctx.handlers.get('tools/post-execute');
    expect(postExecute).toBeDefined();

    const callTool = async (
      name: string,
      args: Record<string, unknown>,
      isError = false,
    ): Promise<void> => {
      await postExecute!(
        { name, arguments: args, agent: { session: { id: 'session-1' } } } satisfies DshToolExecution,
        { isError } satisfies DshToolResult,
        () => 'next',
      );
    };

    await callTool('write_file', { file_path: 'src/a.ts' });
    await callTool('edit_file', { file_path: 'src/b.ts' });
    await callTool('bash', { command: 'npm test' });

    const store = new CheckpointStore(dir);
    const records = await store.read('session-1');
    expect(records.map((item) => item.stepType)).toEqual(['edit-burst', 'test-pass']);

    const tool = ctx.registered[0] as RegisteredTool;
    expect(tool.name).toBe('session_recovery');
    expect(typeof tool.output.render).toBe('function');
    expect(tool.output.schema).toEqual({ type: 'object', additionalProperties: true });
    expect(Array.isArray(tool.output.render({}, { ok: true }))).toBe(true);

    const listed = await tool.execute({ action: 'list' }, {});
    expect(typeof listed).toBe('object');
    expect(listed.count).toBe(1);
    expect((listed.candidates as { sessionId: string; steps: number }[])[0])
      .toMatchObject({ sessionId: 'session-1', steps: 2 });

    const section = ctx.promptSection;
    expect(section).not.toBeNull();
    const renderPrompt = section!.text as (value: { agent?: { session?: { id?: string } } }) => string;
    expect(renderPrompt({ agent: { session: { id: 'new-session-1' } } })).toBe('');

    const resumed = await tool.execute(
      { action: 'resume', sessionId: 'session-1' },
      {},
    ) as {
      ok: boolean;
      newSessionId: string | null;
      summary: string;
      errorCode: string | null;
    };
    expect(resumed.ok).toBe(true);
    expect(resumed.newSessionId).toBe('new-session-1');
    expect(resumed.errorCode).toBeNull();
    expect(Array.from(resumed.summary).length).toBeLessThanOrEqual(500);
    expect(resumed.summary).toContain('src/b.ts');

    // 摘要只注入一次，第二次组装为空。
    expect(renderPrompt({ agent: { session: { id: 'new-session-1' } } })).toBe(resumed.summary);
    expect(renderPrompt({ agent: { session: { id: 'new-session-1' } } })).toBe('');

    const afterResume = await tool.execute({ action: 'list' }, {}) as { count: number };
    expect(afterResume.count).toBe(0);
  });

  it('dismiss marks a candidate complete without creating a session', async () => {
    const dir = await makeRecoveryDir();
    process.env.DSH_RECOVERY_DIR = dir;
    await new CheckpointStore(dir).append('session-2', record(Date.now() - 1_000));

    const ctx = createMockContext();
    await apply(ctx);
    const tool = ctx.registered[0] as RegisteredTool;

    expect((await tool.execute({ action: 'list' }, {}) as { count: number }).count).toBe(1);
    expect(await tool.execute({ action: 'dismiss', sessionId: 'session-2' }, {}))
      .toMatchObject({ ok: true, sessionId: 'session-2' });
    expect((await tool.execute({ action: 'list' }, {}) as { count: number }).count).toBe(0);
  });

  it('logs only sessions with checkpoints inside the 24 hour window at startup', async () => {
    const dir = await makeRecoveryDir();
    process.env.DSH_RECOVERY_DIR = dir;
    const store = new CheckpointStore(dir);
    const now = Date.now();
    await store.append('fresh', record(now - 60 * 60 * 1000));
    await store.append('stale', record(now - 25 * 60 * 60 * 1000));

    const ctx = createMockContext();
    await apply(ctx);

    const scan = ctx.logs.find((entry) => entry.message.includes('startup scan complete'));
    expect(scan).toBeDefined();
    expect(scan!.fields?.candidates).toEqual([{ sessionId: 'fresh', steps: 1 }]);
  });
});
