import type { DshClientContext, Disposer } from './types/clientContext.ts';
import { type RecoveryState, type ResumeResult } from './model/types.ts';
export declare class HostClient {
    private readonly ctx;
    constructor(ctx: DshClientContext);
    getRecoveryState(): Promise<RecoveryState>;
    resumeSession(sessionId: string): Promise<ResumeResult>;
    dismissRecovery(sessionId: string): Promise<boolean>;
    subscribeScan(handler: (state: RecoveryState) => void): Disposer;
}
//# sourceMappingURL=hostClient.d.ts.map