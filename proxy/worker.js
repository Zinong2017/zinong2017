/**
 * Zinong2017 PM Agent — Cloudflare Worker 代理
 *
 * 功能：
 * 1. 代理 DeepSeek API 请求（保护 API Key）
 * 2. 可选的 Brave Search 网页搜索集成
 * 3. 流式 SSE 透传
 *
 * 部署步骤：
 * 1. 打开 https://dash.cloudflare.com → Workers & Pages → 创建 Worker
 * 2. 粘贴此文件全部内容
 * 3. 在 Worker 设置中添加 Secret：
 *    - DEEPSEEK_API_KEY：你的 DeepSeek API Key
 *    - BRAVE_SEARCH_API_KEY（可选）：Brave Search API Key
 * 4. 部署，记下 Worker URL（如 https://pm-proxy.xxx.workers.dev）
 * 5. 将 Worker URL 填入 js/main.js 中的 PROXY_URL 变量
 */

// ========== 配置 ==========
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

// CORS 头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ========== 速率限制（简易版，同一 IP 每分钟最多 20 次） ==========
const RATE_LIMIT_MAP = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分钟窗口
  const maxRequests = 20;

  if (!RATE_LIMIT_MAP.has(ip)) {
    RATE_LIMIT_MAP.set(ip, { count: 1, windowStart: now });
    return true;
  }

  const record = RATE_LIMIT_MAP.get(ip);
  if (now - record.windowStart > windowMs) {
    // 新窗口
    record.count = 1;
    record.windowStart = now;
    return true;
  }

  record.count++;
  return record.count <= maxRequests;
}

// 定期清理过期记录（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, record] of RATE_LIMIT_MAP) {
    if (now - record.windowStart > windowMs * 2) {
      RATE_LIMIT_MAP.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ========== Brave Search ==========
async function braveSearch(query, apiKey) {
  const params = new URLSearchParams({
    q: query,
    count: '5',
    search_lang: 'zh',
  });

  const resp = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!resp.ok) {
    console.error('Brave Search error:', resp.status);
    return null;
  }

  const data = await resp.json();

  // 提取搜索结果摘要
  const results = (data.web && data.web.results) || [];
  return results.map(r => ({
    title: r.title || '',
    url: r.url || '',
    description: r.description || '',
  }));
}

// 将搜索结果格式化为文本注入 Prompt
function formatSearchResults(results, query) {
  if (!results || results.length === 0) return '';

  let text = `\n\n【网页搜索结果】以下是关于「${query}」的最新信息，请在回答中引用：\n\n`;
  results.forEach((r, i) => {
    text += `[${i + 1}] ${r.title}\n`;
    text += `    URL: ${r.url}\n`;
    text += `    摘要: ${r.description}\n\n`;
  });
  text += '请基于以上搜索结果，结合你的 PM 专业知识回答用户。引用时请注明来源编号。\n';
  return text;
}

// ========== 主处理函数 ==========
async function handleRequest(request, env) {
  // 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // 只接受 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 速率限制
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
      status: 429,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 解析请求体
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: '请求体格式错误' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { messages, stream, enableSearch } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: '缺少 messages 参数' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 网页搜索
  const braveKey = env.BRAVE_SEARCH_API_KEY;
  if (enableSearch && braveKey) {
    try {
      // 提取最后一条用户消息作为搜索查询
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        const searchQuery = lastUserMsg.content.slice(0, 200); // 限制搜索词长度
        const searchResults = await braveSearch(searchQuery, braveKey);
        const searchText = formatSearchResults(searchResults, searchQuery);

        if (searchText) {
          // 注入到 system prompt 或最后一条消息
          const systemIdx = messages.findIndex(m => m.role === 'system');
          if (systemIdx >= 0) {
            messages[systemIdx].content += searchText;
          } else {
            messages.unshift({ role: 'system', content: searchText });
          }
        }
      }
    } catch (e) {
      console.error('搜索失败，继续无搜索回答:', e.message);
      // 搜索失败不影响主流程
    }
  }

  // 获取 DeepSeek API Key
  const deepseekKey = env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return new Response(JSON.stringify({ error: '服务端未配置 API Key' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 调用 DeepSeek API
  const deepseekBody = {
    model: 'deepseek-chat',
    messages: messages,
    stream: stream !== false,
    temperature: 0.7,
    max_tokens: 4096,
  };

  const deepseekResp = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify(deepseekBody),
  });

  if (!deepseekResp.ok) {
    const errText = await deepseekResp.text();
    console.error('DeepSeek API error:', deepseekResp.status, errText);
    return new Response(JSON.stringify({ error: `AI 服务返回错误: ${deepseekResp.status}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 流式透传
  if (stream !== false) {
    const newHeaders = new Headers(deepseekResp.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    return new Response(deepseekResp.body, {
      status: deepseekResp.status,
      headers: newHeaders,
    });
  }

  // 非流式返回
  const data = await deepseekResp.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ========== Worker 入口 ==========
export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error('Worker 错误:', err.message);
      return new Response(JSON.stringify({ error: '服务内部错误' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
