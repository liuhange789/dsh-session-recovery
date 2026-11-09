export interface RecoveryCandidate {
    readonly sessionId: string;
    readonly steps: number;
    readonly lastTimestamp: number;
    readonly lastStepType: 'edit-burst' | 'test-pass';
    readonly lastToolName: string;
    readonly lastSummaries: readonly string[];
}
export interface RecoveryState {
    readonly candidates: readonly RecoveryCandidate[];
}
export interface ResumeResult {
    readonly summary: string;
    readonly newSessionId: string | null;
    readonly errorCode: string | null;
}
export declare const EMPTY_RECOVERY_STATE: RecoveryState;
export declare const EMPTY_RESUME_RESULT: ResumeResult;
//# sourceMappingURL=types.d.ts.map