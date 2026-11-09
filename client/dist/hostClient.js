import { EMPTY_RECOVERY_STATE, EMPTY_RESUME_RESULT, } from "./model/types.js";
export class HostClient {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    async getRecoveryState() {
        try {
            return (await this.ctx.host.call('getRecoveryState'));
        }
        catch {
            return EMPTY_RECOVERY_STATE;
        }
    }
    async resumeSession(sessionId) {
        try {
            return (await this.ctx.host.call('resumeSession', sessionId));
        }
        catch {
            return EMPTY_RESUME_RESULT;
        }
    }
    async dismissRecovery(sessionId) {
        try {
            const result = (await this.ctx.host.call('dismissRecovery', sessionId));
            return result.ok === true;
        }
        catch {
            return false;
        }
    }
    subscribeScan(handler) {
        return this.ctx.host.subscribe('onRecoveryScan', (payload) => {
            handler(payload);
        });
    }
}
//# sourceMappingURL=hostClient.js.map