import { type CheckpointRecord } from '../checkpoint/types.ts';
/** 按字符（而不是 UTF-16 码元）截断，超长时以省略号结尾。 */
export declare function truncateText(text: string, limit: number): string;
/**
 * 提取工具参数里对“做到哪一步”最有信息量的片段，
 * 结果不超过 {@link ARG_SUMMARY_LIMIT} 个字符。
 */
export declare function summarizeArgs(args: unknown, limit?: number): string;
/**
 * 生成恢复摘要：引用最后 3 个检查点的 argSummary，总长度不超过
 * {@link SUMMARY_LIMIT} 个字符，且保留固定结尾。
 */
export declare function buildRecoverySummary(records: readonly CheckpointRecord[], limit?: number): string;
//# sourceMappingURL=summary.d.ts.map