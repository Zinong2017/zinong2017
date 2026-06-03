"""
Zinong2017 PM Agent — 本地 API 代理服务器

功能：接收前端 POST 请求，转发到 DeepSeek API，流式 SSE 透传。
用途：本地开发和测试 PM 智能体，无需部署 Cloudflare Worker。

启动方式：
  set DEEPSEEK_API_KEY=sk-你的key
  python proxy/server.py

  默认监听 http://localhost:8081
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

# Windows 下强制 UTF-8 输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ========== 配置 ==========
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
# 可选：Brave Search API Key（用于网页搜索功能）
BRAVE_SEARCH_API_KEY = os.environ.get("BRAVE_SEARCH_API_KEY", "")
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"

PORT = int(os.environ.get("PROXY_PORT", "8081"))


def get_api_key():
    """获取 DeepSeek API Key（环境变量或直接配置）"""
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not key:
        # 尝试从 Claude Code 配置中读取
        claude_settings = os.path.join(
            os.path.expanduser("~"), ".claude", "settings.json"
        )
        try:
            with open(claude_settings, "r", encoding="utf-8") as f:
                settings = json.load(f)
            key = settings.get("env", {}).get("ANTHROPIC_AUTH_TOKEN", "")
            if not (key and key.startswith("sk-")):
                key = ""
        except Exception:
            pass
    return key


def brave_search(query, api_key):
    """调用 Brave Search API 获取搜索结果"""
    if not api_key:
        return []

    params = urllib.parse.urlencode({
        "q": query[:200],
        "count": "5",
        "search_lang": "zh",
    })
    req = urllib.request.Request(
        f"{BRAVE_SEARCH_URL}?{params}",
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": api_key,
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = (data.get("web") or {}).get("results") or []
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", ""),
            }
            for r in results
        ]
    except Exception as e:
        print(f"[搜索] Brave Search 失败: {e}")
        return []


def format_search_results(results, query):
    """将搜索结果格式化为 Prompt 文本"""
    if not results:
        return ""
    text = f"\n\n【网页搜索结果】以下是关于「{query}」的最新信息，请在回答中引用：\n\n"
    for i, r in enumerate(results):
        text += f"[{i + 1}] {r['title']}\n"
        text += f"    URL: {r['url']}\n"
        text += f"    摘要: {r['description']}\n\n"
    text += "请基于以上搜索结果，结合你的 PM 专业知识回答用户。引用时请注明来源编号。\n"
    return text


class ProxyHandler(BaseHTTPRequestHandler):
    """HTTP 请求处理器"""

    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        """处理 POST 请求 — 转发到 DeepSeek API"""
        # 限制请求路径
        if self.path not in ("/", "/v1/chat/completions", ""):
            self.send_error_json(404, "未找到路径")
            return

        # 读取请求体
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_error_json(400, "请求体为空")
            return

        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error_json(400, "请求体 JSON 格式错误")
            return

        messages = body.get("messages")
        if not messages or not isinstance(messages, list):
            self.send_error_json(400, "缺少 messages 参数")
            return

        # 获取 API Key
        api_key = get_api_key()
        if not api_key:
            self.send_error_json(500, "服务端未配置 DEEPSEEK_API_KEY。请在环境变量中设置：set DEEPSEEK_API_KEY=sk-你的key")
            return

        # ===== 网页搜索（可选）=====
        enable_search = body.get("enableSearch", False)
        if enable_search and BRAVE_SEARCH_API_KEY:
            try:
                last_user_msg = next(
                    (m for m in reversed(messages) if m.get("role") == "user"),
                    None
                )
                if last_user_msg:
                    query = last_user_msg.get("content", "")[:200]
                    results = brave_search(query, BRAVE_SEARCH_API_KEY)
                    search_text = format_search_results(results, query)
                    if search_text:
                        sys_idx = next(
                            (i for i, m in enumerate(messages) if m.get("role") == "system"),
                            -1
                        )
                        if sys_idx >= 0:
                            messages[sys_idx]["content"] += search_text
                        else:
                            messages.insert(0, {"role": "system", "content": search_text})
                        print(f"[搜索] 已注入 {len(results)} 条搜索结果到 Prompt")
            except Exception as e:
                print(f"[搜索] 搜索流程异常: {e}")

        # ===== 调用 DeepSeek API =====
        stream = body.get("stream", True)
        deepseek_body = {
            "model": "deepseek-chat",
            "messages": messages,
            "stream": stream,
            "temperature": 0.7,
            "max_tokens": 4096,
        }

        req_data = json.dumps(deepseek_body).encode("utf-8")
        api_req = urllib.request.Request(
            DEEPSEEK_API_URL,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            api_resp = urllib.request.urlopen(api_req, timeout=180)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            print(f"[DeepSeek] API 错误 {e.code}: {err_body[:300]}")
            self.send_error_json(502, f"AI 服务返回错误: {e.code}")
            return
        except Exception as e:
            print(f"[DeepSeek] 请求异常: {e}")
            self.send_error_json(502, f"请求 AI 服务失败: {str(e)}")
            return

        # ===== 流式透传 =====
        if stream:
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()

            try:
                while True:
                    chunk = api_resp.readline()
                    if not chunk:
                        break
                    # 透传每一行（DeepSeek 返回的已经是 SSE 格式）
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except Exception as e:
                print(f"[流式] 传输中断: {e}")
            finally:
                api_resp.close()
        else:
            # 非流式返回
            resp_data = api_resp.read()
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(resp_data)

    def send_error_json(self, code, message):
        """发送 JSON 格式错误响应"""
        self.send_response(code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        err = json.dumps({"error": message}, ensure_ascii=False)
        self.wfile.write(err.encode("utf-8"))


def main():
    print("=" * 50)
    print("  Zinong2017 PM Agent — 本地 API 代理")
    print("=" * 50)

    # 检查 API Key
    api_key = get_api_key()
    if not api_key:
        print("\n[!] 未检测到 DEEPSEEK_API_KEY！")
        print("请先设置环境变量：")
        print('  set DEEPSEEK_API_KEY=sk-你的key')
        print("\n按 Enter 继续（将无法正常使用）...")
        input()
    else:
        masked = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
        print(f"\n[OK] DeepSeek API Key: {masked}")

    if BRAVE_SEARCH_API_KEY:
        print(f"[OK] Brave Search API: 已配置（支持网页搜索）")
    else:
        print("[i] Brave Search API: 未配置（搜索功能不可用，不影响基础对话）")

    print(f"\n>>> 代理服务器启动在 http://localhost:{PORT}")
    print("    按 Ctrl+C 停止\n")

    server = HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n服务器已停止。")
        server.shutdown()


if __name__ == "__main__":
    main()
