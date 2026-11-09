import { ARG_SUMMARY_LIMIT, SUMMARY_CHECKPOINT_COUNT, SUMMARY_LIMIT, } from "../checkpoint/types.js";
const PREFERRED_KEYS = [
    'file_path',
    'filePath',
    'path',
    'target_file',
    'command',
    'pattern',
    'query',
    'content',
    'new_string',
    'old_string',
];
const SUMMARY_PREFIX = '上次会话执行到：';
const SUMMARY_SUFFIX = '。用户选择从此处继续。';
/** 按字符（而不是 UTF-16 码元）截断，超长时以省略号结尾。 */
export function truncateText(text, limit) {
    if (limit <= 0)
        return '';
    const characters = Array.from(text);
    if (characters.length <= limit)
        return text;
    return characters.slice(0, Math.max(0, limit - 1)).join('') + '…';
}
function collapseWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}
function stringifyValue(value) {
    if (typeof value === 'string')
        return collapseWhitespace(value);
    if (value === null || value === undefined)
        return '';
    try {
        return collapseWhitespace(JSON.stringify(value));
    }
    catch {
        return String(value);
    }
}
/**
 * 提取工具参数里对“做到哪一步”最有信息量的片段，
 * 结果不超过 {@link ARG_SUMMARY_LIMIT} 个字符。
 */
export function summarizeArgs(args, limit = ARG_SUMMARY_LIMIT) {
    if (args === undefined || args === null)
        return '';
    if (typeof args !== 'object')
        return truncateText(collapseWhitespace(String(args)), limit);
    const record = args;
    const parts = [];
    for (const key of PREFERRED_KEYS) {
        if (!(key in record))
            continue;
        const rendered = stringifyValue(record[key]);
        if (rendered.length === 0)
            continue;
        parts.push(`${key}=${truncateText(rendered, 120)}`);
        if (parts.length >= 3)
            break;
    }
    const summary = parts.length > 0 ? parts.join(' | ') : stringifyValue(record);
    return truncateText(summary, limit);
}
/**
 * 生成恢复摘要：引用最后 3 个检查点的 argSummary，总长度不超过
 * {@link SUMMARY_LIMIT} 个字符，且保留固定结尾。
 */
export function buildRecoverySummary(records, limit = SUMMARY_LIMIT) {
    if (records.length === 0)
        return '';
    const body = records
        .slice(-SUMMARY_CHECKPOINT_COUNT)
        .map((record) => record.argSummary)
        .filter((summary) => summary.length > 0)
        .join('；');
    if (body.length === 0)
        return '';
    const budget = limit - Array.from(SUMMARY_PREFIX).length - Array.from(SUMMARY_SUFFIX).length;
    if (budget <= 0) {
        return truncateText(SUMMARY_PREFIX + body + SUMMARY_SUFFIX, limit);
    }
    return SUMMARY_PREFIX + truncateText(body, budget) + SUMMARY_SUFFIX;
}
//# sourceMappingURL=summary.js.map