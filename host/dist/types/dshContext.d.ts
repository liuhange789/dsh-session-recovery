export type Disposer = () => void;
export interface DshAgent {
    readonly session?: {
        readonly id?: string;
    };
}
export interface DshToolExecution {
    readonly name?: string;
    readonly arguments?: unknown;
    readonly agent?: DshAgent;
}
export interface DshToolResult {
    readonly isError?: boolean;
}
export interface DshSession {
    readonly id: string;
}
export interface DshSessionsService {
    create(): DshSession;
}
export interface DshSystemPromptContext {
    readonly agent?: DshAgent;
}
export interface DshPromptSection {
    readonly name: string;
    readonly order: number;
    readonly text: string | ((context: DshSystemPromptContext) => string);
}
export interface DshSystemPromptService {
    section(section: DshPromptSection): Disposer;
}
export interface DshToolsService {
    register(tool: unknown): Disposer;
}
export interface DshHostContext {
    on(eventName: string, handler: (...args: unknown[]) => unknown): Disposer;
    effect<T>(fn: () => Disposer | Promise<Disposer>): T;
    inject: readonly string[];
    log(level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>): void;
    readonly systemPrompt?: DshSystemPromptService;
    readonly sessions?: DshSessionsService;
    readonly tools?: DshToolsService;
}
//# sourceMappingURL=dshContext.d.ts.map