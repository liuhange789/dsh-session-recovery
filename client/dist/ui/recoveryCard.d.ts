import type { RecoveryCandidate } from '../model/types.ts';
export interface RecoveryCardHandlers {
    onResume(sessionId: string): Promise<void>;
    onDismiss(sessionId: string): Promise<void>;
}
/**
 * 会话列表顶部的恢复卡片。只展示最近 3 个候选，继续后打开宿主创建的新会话。
 */
export declare class RecoveryCard {
    private el;
    private readonly handlers;
    constructor(handlers: RecoveryCardHandlers);
    mount(container: HTMLElement): void;
    render(candidates: readonly RecoveryCandidate[]): void;
    hide(): void;
    unmount(): void;
    private renderCandidate;
}
//# sourceMappingURL=recoveryCard.d.ts.map