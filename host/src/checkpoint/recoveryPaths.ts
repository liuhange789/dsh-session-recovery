import os from 'node:os';
import path from 'node:path';

/**
 * 解析 DSH home。优先使用宿主注入的 `$DSH_HOME`，这是 DSH 自己
 * `@deepseek-ai/dsh-home-paths` 也遵循的覆盖规则；没有覆盖时才回退到
 * 操作系统 home 下的 `.dsh`。这里不写死任何用户目录。
 */
export function dshHome(): string {
  const override = process.env.DSH_HOME?.trim();
  if (override !== undefined && override.length > 0) return path.resolve(override);
  return path.join(os.homedir(), '.dsh');
}

/**
 * 检查点目录优先级：
 * 1. `$DSH_RECOVERY_DIR` —— 仅用于测试和运维显式覆盖；
 * 2. `$DSH_HOME/profiles/web/recovery` —— 宿主给定的 home；
 * 3. `~/.dsh/profiles/web/recovery` —— DSH 默认布局。
 */
export function defaultRecoveryDir(): string {
  const explicit = process.env.DSH_RECOVERY_DIR?.trim();
  if (explicit !== undefined && explicit.length > 0) return path.resolve(explicit);
  return path.join(dshHome(), 'profiles', 'web', 'recovery');
}

/** 把会话 id 映射成安全的文件名片段，避免路径穿越与非法字符。 */
export function sanitizeSessionId(sessionId: string): string {
  const sanitized = sessionId.replace(/[^A-Za-z0-9._-]/g, '_');
  return sanitized.length === 0 ? 'unknown-session' : sanitized;
}

export function checkpointFilePath(dir: string, sessionId: string): string {
  return path.join(dir, `${sanitizeSessionId(sessionId)}.jsonl`);
}

export function completedMarkerPath(dir: string, sessionId: string): string {
  return path.join(dir, `${sanitizeSessionId(sessionId)}.completed.json`);
}
