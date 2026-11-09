import type {
  DshHostContext,
  DshToolExecution,
  DshToolResult,
} from './types/dshContext.ts';
import { CheckpointStore } from './checkpoint/checkpointStore.ts';
import { defaultRecoveryDir } from './checkpoint/recoveryPaths.ts';
import { TriggerTracker } from './checkpoint/triggerTracker.ts';
import { PendingResumeRegistry } from './recovery/resumeRegistry.ts';
import { RecoveryService } from './recovery/recoveryService.ts';
import { createRecoveryTool } from './tool/recoveryTool.ts';

export const name = '@liuhange/dsh-session-recovery';

/**
 * `sessions` 用于恢复时创建新会话；`systemPrompt` 用于注入摘要；
 * `tools` 用于监听工具结果并注册 `session_recovery` 工具。
 */
export const inject = ['tools', 'systemPrompt', 'sessions'] as const;

/**
 * 插件入口：
 * 1. 监听 tools/post-execute，按规则写入 JSONL 检查点；
 * 2. 启动时扫描 recovery 目录，把 24 小时内未完成会话写进日志；
 * 3. 注册 systemPrompt 片段，恢复会话时注入不超过 500 字的精简摘要；
 * 4. 注册 session_recovery 工具，让模型可以列出 / 继续 / 忽略候选会话。
 */
export async function apply(ctx: DshHostContext): Promise<void> {
  const dir = defaultRecoveryDir();
  const store = new CheckpointStore(dir);
  const tracker = new TriggerTracker();
  const pending = new PendingResumeRegistry();
  const service = new RecoveryService({
    store,
    tracker,
    pending,
    sessions: ctx.sessions,
  });

  const postExecute = async (
    exec: DshToolExecution,
    result: DshToolResult,
    next: () => unknown,
  ): Promise<unknown> => {
    try {
      // 等检查点真正落盘再放行后续流程：中断可能发生在下一步，
      // 写入如果被异步丢在后台，恰好会丢掉最关键的那一条。
      await service.observeToolResult(exec, result);
    } catch (error) {
      // 检查点写入失败不能影响主流程，只记录警告。
      ctx.log('warn', 'session-recovery: checkpoint write failed', { error: String(error) });
    }
    return next();
  };

  ctx.on('tools/post-execute', postExecute as (...args: unknown[]) => unknown);

  if (ctx.systemPrompt) {
    ctx.effect(() => ctx.systemPrompt!.section({
      name: 'session-recovery:resume',
      order: 195,
      text: (context) => {
        const sessionId = context.agent?.session?.id ?? '';
        // consume 而不是 peek：摘要只注入一次，避免恢复后的每条消息
        // 都重复携带同一段进度，污染上下文。
        return sessionId.length === 0 ? '' : pending.consume(sessionId);
      },
    }));
  }

  if (ctx.tools) {
    ctx.tools.register(createRecoveryTool(service));
  }

  const candidates = await service.getCandidates();
  ctx.log('info', 'session-recovery: startup scan complete', {
    directory: dir,
    candidates: candidates.map((candidate) => ({
      sessionId: candidate.sessionId,
      steps: candidate.steps,
    })),
  });
}

/**
 * 本机既有插件的 Host 入口使用 `setup`，DSH 的 cordis 加载器使用 `apply`。
 * 两个名字指向同一实现，避免因加载器版本不同而静默不激活。
 */
export const setup = apply;
