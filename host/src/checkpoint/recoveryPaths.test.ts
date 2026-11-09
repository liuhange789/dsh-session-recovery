import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { defaultRecoveryDir, dshHome, sanitizeSessionId } from './recoveryPaths.ts';

const original = {
  DSH_HOME: process.env.DSH_HOME,
  DSH_RECOVERY_DIR: process.env.DSH_RECOVERY_DIR,
};

function restore(key: 'DSH_HOME' | 'DSH_RECOVERY_DIR'): void {
  const value = original[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe('recoveryPaths', () => {
  it('uses the host-provided DSH_HOME instead of a hardcoded user directory', () => {
    process.env.DSH_HOME = 'D:\\host-home';
    delete process.env.DSH_RECOVERY_DIR;
    expect(dshHome()).toBe(path.resolve('D:\\host-home'));
    expect(defaultRecoveryDir()).toBe(path.join(path.resolve('D:\\host-home'), 'profiles', 'web', 'recovery'));
    restore('DSH_HOME');
    restore('DSH_RECOVERY_DIR');
  });

  it('lets DSH_RECOVERY_DIR override everything (tests and operations)', () => {
    process.env.DSH_HOME = 'D:\\host-home';
    process.env.DSH_RECOVERY_DIR = 'D:\\tmp\\recovery';
    expect(defaultRecoveryDir()).toBe(path.resolve('D:\\tmp\\recovery'));
    restore('DSH_HOME');
    restore('DSH_RECOVERY_DIR');
  });

  it('falls back to the OS home when no override exists', () => {
    delete process.env.DSH_HOME;
    delete process.env.DSH_RECOVERY_DIR;
    expect(defaultRecoveryDir()).toBe(path.join(os.homedir(), '.dsh', 'profiles', 'web', 'recovery'));
    restore('DSH_HOME');
    restore('DSH_RECOVERY_DIR');
  });

  it('sanitizes unsafe session ids', () => {
    expect(sanitizeSessionId('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(sanitizeSessionId('')).toBe('unknown-session');
  });
});
