const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_BASE_URL = 'https://api.tavily.com';

// 优先使用的官方 wiki 域名（按可信度排序）
const TRUSTED_WIKI_DOMAINS = [
  'zh.moegirl.org.cn',       // 萌娘百科
  'moegirl.org.cn',
  'fandom.com',              // Fandom wiki
  'miyoushe.com',            // 米游社（米哈游官方社区）
  'baike.baidu.com',         // 百度百科
  'zh.wikipedia.org',        // 维基百科
];

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  answer: string;
  results: TavilySearchResult[];
}

/**
 * 判断 URL 是否来自可信 wiki 来源
 */
function isTrustedWikiUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return TRUSTED_WIKI_DOMAINS.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * 从搜索结果中提取 wiki 类来源的内容
 * 优先返回可信 wiki 的详细内容，过滤掉 Reddit、论坛等低质量来源
 */
export function extractWikiContent(results: TavilySearchResult[]): string {
  const wikiResults = results.filter((r) => isTrustedWikiUrl(r.url));
  const otherResults = results.filter((r) => !isTrustedWikiUrl(r.url));

  // 优先使用 wiki 内容，wiki 不足时补充其他来源
  const prioritized = [...wikiResults, ...otherResults];

  return prioritized
    .map((r, i) => {
      const source = isTrustedWikiUrl(r.url) ? '【官方wiki】' : '【参考】';
      return `[${i + 1}] ${source} ${r.title}\n    内容：${r.content?.substring(0, 500) || '无详细内容'}\n    来源：${r.url}`;
    })
    .join('\n\n');
}

/**
 * 搜索角色官方外貌设定（优先获取 wiki 内容）
 * @param query 搜索查询（包含角色名和来源）
 * @param maxResults 最大结果数
 * @returns 搜索结果和 AI 生成的摘要答案
 */
export async function searchCharacterAppearance(
  query: string,
  maxResults: number = 8
): Promise<TavilyResponse> {
  const response = await fetch(`${TAVILY_BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: false,  // 不使用 Tavily 的 summary answer，避免不准确
      search_depth: 'advanced',  // 使用 advanced 深度搜索获取更详细内容
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`Tavily API error (${response.status}):`, errText.substring(0, 300));
    throw new Error(`Tavily API ${response.status}`);
  }

  return response.json();
}

/**
 * 构建角色外貌搜索查询（优化查询词以提高 wiki 命中率）
 */
export function buildCharacterQuery(
  name: string,
  sourceType?: string,
  sourceName?: string
): string {
  const parts: string[] = [];
  if (sourceName) parts.push(sourceName);
  parts.push(name);
  // 使用更精确的查询词，提高 wiki 命中率
  parts.push('发色 瞳色 发型 外貌 设定 资料');
  return parts.join(' ');
}
