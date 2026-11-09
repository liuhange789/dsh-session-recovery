const ACTIONS = ['list', 'resume', 'dismiss'];
function readAction(args) {
    if (typeof args !== 'object' || args === null)
        return '';
    const value = args.action;
    return typeof value === 'string' ? value : '';
}
function readSessionId(args) {
    if (typeof args !== 'object' || args === null)
        return '';
    const value = args.sessionId;
    return typeof value === 'string' ? value : '';
}
function isRecoveryAction(action) {
    return ACTIONS.includes(action);
}
/**
 * `session_recovery` 工具：让模型在会话内列出、继续或忽略未完成会话。
 * output.schema 是对象，output.render 是函数，execute 返回对象（不是 JSON 字符串）。
 */
export function createRecoveryTool(service) {
    return {
        name: 'session_recovery',
        description: '列出 24 小时内中断的会话检查点，继续某个会话（新建会话并注入最后 3 个检查点的精简摘要），或把会话标记为已完成。',
        parameters: {
            action: {
                type: 'string',
                required: true,
                description: '操作：list 列出候选、resume 从检查点继续、dismiss 标记完成。',
            },
            sessionId: {
                type: 'string',
                description: 'list 时可省略；resume 与 dismiss 时必须提供目标会话 id。',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
            },
            render: (_args, value) => [{
                    type: 'text',
                    text: JSON.stringify(value, null, 2),
                }],
        },
        async execute(args, _exec) {
            const action = readAction(args);
            if (!isRecoveryAction(action)) {
                return { action, ok: false, errorCode: 'INVALID_ACTION' };
            }
            if (action === 'list') {
                const candidates = await service.getCandidates();
                return { action, ok: true, count: candidates.length, candidates };
            }
            const sessionId = readSessionId(args);
            if (sessionId.length === 0) {
                return { action, ok: false, errorCode: 'MISSING_SESSION_ID' };
            }
            if (action === 'dismiss') {
                const dismissed = await service.dismiss(sessionId);
                return { action, ok: dismissed, sessionId, errorCode: dismissed ? null : 'INVALID_SESSION_ID' };
            }
            const result = await service.resume(sessionId);
            return {
                action,
                ok: result.errorCode === null,
                sessionId,
                newSessionId: result.newSessionId,
                summary: result.summary,
                errorCode: result.errorCode,
                nextStep: result.newSessionId === null
                    ? null
                    : '新会话已创建，注入摘要将在它下一次回复时生效；请在会话列表中打开它继续。',
            };
        },
    };
}
//# sourceMappingURL=recoveryTool.js.map