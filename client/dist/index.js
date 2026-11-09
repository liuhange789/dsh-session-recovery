import { HostClient } from "./hostClient.js";
import { RecoveryCard } from "./ui/recoveryCard.js";
export async function setup(ctx) {
    const hostClient = new HostClient(ctx);
    const container = document.createElement('div');
    const sessionList = ctx.ui.sessionList;
    if (sessionList) {
        sessionList.mountTop(container);
    }
    else {
        ctx.ui.hintArea.mount(container);
    }
    const card = new RecoveryCard({
        async onResume(sessionId) {
            const result = await hostClient.resumeSession(sessionId);
            if (result.errorCode !== null) {
                ctx.log('warn', 'session-recovery: resume failed', { errorCode: result.errorCode });
                throw new Error(result.errorCode);
            }
            if (result.newSessionId !== null && ctx.sessions) {
                ctx.sessions.open(result.newSessionId);
            }
        },
        async onDismiss(sessionId) {
            const ok = await hostClient.dismissRecovery(sessionId);
            if (!ok) {
                ctx.log('warn', 'session-recovery: dismiss failed', { sessionId });
                throw new Error('DISMISS_FAILED');
            }
        },
    });
    card.mount(container);
    const applyState = (state) => {
        card.render(state.candidates);
    };
    applyState(await hostClient.getRecoveryState());
    const disposer = hostClient.subscribeScan(applyState);
    return () => {
        disposer();
        card.unmount();
        if (sessionList) {
            sessionList.unmount();
        }
        else {
            ctx.ui.hintArea.unmount();
        }
    };
}
//# sourceMappingURL=index.js.map