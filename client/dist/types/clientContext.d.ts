export type Disposer = () => void;
export interface DshClientContext {
    host: {
        call(method: string, ...args: unknown[]): Promise<unknown>;
        subscribe(event: string, handler: (payload: unknown) => void): Disposer;
    };
    ui: {
        /** 会话列表顶部挂载点；宿主未提供时回退到输入区上方。 */
        sessionList?: {
            mountTop(element: HTMLElement): void;
            unmount(): void;
        };
        hintArea: {
            mount(element: HTMLElement): void;
            unmount(): void;
        };
    };
    sessions?: {
        open(sessionId: string): void;
    };
    log(level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>): void;
}
//# sourceMappingURL=clientContext.d.ts.map