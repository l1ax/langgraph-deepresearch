/**
 * @file 工具函数
 */

export { checkpointer, initCheckpointer } from './checkpointer';
export * as eventStore from './eventStore';

/**
 * 获取当前日期
 */
export function getTodayStr(): string {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();

  return `${dayName} ${monthName} ${day}, ${year}`;
}

/**
 * 从 LLM 响应中提取文本内容
 * 
 * LLM 响应的 content 可能是字符串或包含多个块的数组
 * 此函数统一处理这两种情况，提取纯文本内容
 */
export function extractContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map(block => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'text' in block) {
          return (block as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  return '';
}
