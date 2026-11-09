import type { CheckpointRecord } from './types.ts';
import { summarizeArgs } from '../recovery/summary.ts';

const EDIT_NAMES = new Set([
  'write',
  'write_file',
  'writefile',
  'edit',
  'edit_file',
  'editfile',
  'apply_patch',
  'applypatch',
  'str_replace_editor',
  'create_file',
  'createfile',
  'multiedit',
  'multi_edit',
  'notebook_edit',
  'replace_in_file',
  'insert_content',
]);

const SHELL_NAMES = new Set([
  'bash',
  'shell',
  'sh',
  'pwsh',
  'powershell',
  'terminal',
  'run_command',
  'runcommand',
  'exec_command',
  'execute_command',
  'shell_command',
  'command',
  'run',
  'tool_bash',
  'tool_pwsh',
]);

const TEST_COMMAND = /(?:^|[\s;&|])(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|tests|vitest|jest)(?:\s|$)|(?:^|[\s;&|])(?:npx\s+)?(?:vitest|jest|pytest|mocha)(?:\s|$)|python(?:3)?\s+-m\s+(?:pytest|unittest)|go\s+test|cargo\s+test|mvn(?:w)?\b[^\n]*\btest\b|gradlew?\b[^\n]*\btest\b|dotnet\s+test|\brspec\b|\bphpunit\b/i;

function tokensOf(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase());
}

function isEditTool(name: string): boolean {
  const normalized = name.toLowerCase();
  if (EDIT_NAMES.has(normalized)) return true;
  const tokens = tokensOf(name);
  return (
    (tokens.includes('write') && tokens.includes('file'))
    || (tokens.includes('edit') && tokens.includes('file'))
    || (tokens.includes('apply') && tokens.includes('patch'))
    || (tokens.includes('replace') && tokens.includes('file'))
  );
}

function isShellTool(name: string): boolean {
  const normalized = name.toLowerCase();
  if (SHELL_NAMES.has(normalized)) return true;
  const tokens = tokensOf(name);
  return tokens.includes('bash') || tokens.includes('shell') || tokens.includes('pwsh');
}

function commandOf(args: unknown): string {
  if (typeof args === 'string') return args;
  if (typeof args !== 'object' || args === null) return '';
  const record = args as Record<string, unknown>;
  for (const key of ['command', 'cmd', 'script', 'input']) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function isShellTestCall(name: string, args: unknown): boolean {
  if (!isShellTool(name)) return false;
  return TEST_COMMAND.test(commandOf(args));
}

export interface ToolObservation {
  readonly sessionId: string;
  readonly name: string;
  readonly args: unknown;
  readonly isError: boolean;
  readonly timestamp: number;
}

/**
 * 检查点触发规则：
 * - 连续 2 次成功的 write/edit 调用 → edit-burst
 * - 1 次成功的 bash 测试命令 → test-pass
 * 失败调用或其它成功调用都会打断 write/edit 的连续计数。
 */
export class TriggerTracker {
  private readonly streaks = new Map<string, number>();

  observe(observation: ToolObservation): CheckpointRecord | null {
    const { sessionId, name, args, isError, timestamp } = observation;

    if (isError) {
      this.streaks.set(sessionId, 0);
      return null;
    }

    if (isEditTool(name)) {
      const streak = (this.streaks.get(sessionId) ?? 0) + 1;
      if (streak < 2) {
        this.streaks.set(sessionId, streak);
        return null;
      }
      this.streaks.set(sessionId, 0);
      return {
        timestamp,
        stepType: 'edit-burst',
        toolName: name,
        argSummary: summarizeArgs(args),
        resultStatus: 'success',
      };
    }

    this.streaks.set(sessionId, 0);

    if (isShellTestCall(name, args)) {
      return {
        timestamp,
        stepType: 'test-pass',
        toolName: name,
        argSummary: summarizeArgs(args),
        resultStatus: 'success',
      };
    }

    return null;
  }

  streakOf(sessionId: string): number {
    return this.streaks.get(sessionId) ?? 0;
  }

  reset(): void {
    this.streaks.clear();
  }
}
