(function () {
  'use strict';
  document.documentElement.classList.add('js-ready');

  /* ==============================================
     工具函数
     ============================================== */
  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ==============================================
     粒子背景
     ============================================== */
  function initParticles() {
    var canvas = $('particleCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var maxParticles = 60;
    var w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 创建粒子
    for (var i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // 连线
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        // 绘制粒子
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, ' + p.opacity + ')';
        ctx.fill();

        // 连线到附近的粒子
        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var dx = p.x - p2.x;
          var dy = p.y - p2.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(99, 102, 241, ' + (0.08 * (1 - dist / 120)) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // 移动
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ==============================================
     PM Agent 核心
     ============================================== */
  function initPmAgent() {
    var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    var DEEPSEEK_API_KEY = 'sk-6c4da4b366a840cd9168f1bbbed21f43';

    // DOM
    var heroWrapper = $('heroInputWrapper');
    var heroInput = $('heroInput');
    var heroSubmit = $('heroSubmit');
    var heroTags = document.querySelectorAll('.hero__tag');
    var workspace = $('workspace');
    var workspaceBody = $('workspaceBody');
    var workspaceInput = $('workspaceInput');
    var workspaceSend = $('workspaceSend');
    var workspaceBack = $('workspaceBack');
    var workspaceNew = $('workspaceNew');
    var workspaceThinking = $('workspaceThinking');
    var workspaceThinkingBody = $('workspaceThinkingBody');
    var workspaceThinkingToggle = $('workspaceThinkingToggle');
    var workspaceTyping = $('workspaceTyping');

    if (!heroInput || !workspace) return;

    // 状态
    var state = {
      messages: [],
      isStreaming: false,
      abortController: null,
      currentBubble: null
    };

    // ===== Markdown 渲染 =====
    function markdownToHtml(md) {
      if (!md) return '';
      if (typeof marked !== 'undefined' && marked.parse) {
        marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
        return marked.parse(md).replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
      }
      return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
               .replace(/\n\n/g, '<br><br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    // ===== 系统提示词：AI PM Agent 智能体 =====
    function getSystemPrompt() {
      return '你是 Zinong2017 的 AI 数字分身，一名资深的 AI Agent 产品经理。你既是 PM 助手也是产品导师。\n\n' +
        '## 你的角色定位\n' +
        '你是 Zinong2017 本人（AI Agent 产品经理，产品设计专业背景）的 AI 分身。你在与访客对话，代表他的专业能力和产品理念。\n\n' +
        '## 你的核心能力（自行判断用户需要什么）\n' +
        '根据用户输入，你自行判断他/她需要的是：知识解答、还是文档产出、还是方案辅导。\n\n' +
        '### 当用户问知识/方法论问题时 → 你是导师\n' +
        '- 结构化讲解：概念 → 案例 → 实操建议\n' +
        '- 用具体场景说明（如"假设你在设计一个客服 Agent"）\n' +
        '- 引导用户思考更深层的问题\n' +
        '- 如果问题模糊，先追问澄清再回答\n\n' +
        '### 当用户要求产出文档时 → 你是 PM 助手\n' +
        '调用以下 PM 专业技能，输出专业文档：\n\n' +
        '1. **PRD 撰写**：背景与目标 → 用户故事(含场景) → 功能需求(P0/P1/P2 优先级) → 非功能需求 → 指标体系(北极星+过程+质量) → 排期与风险\n' +
        '2. **竞品分析**：功能、体验、定位、商业模式四维度对比 → 差异化建议 → 行动项\n' +
        '3. **需求拆解**：用户故事 → 功能点 → 优先级(MoSCoW) → 依赖关系\n' +
        '4. **产品方案评审**：可行性/风险/体验三角度 → 风险矩阵 → 改进建议\n' +
        '5. **指标设计**：北极星指标 + 过程指标 + 质量指标 → 衡量方式与目标值\n' +
        '6. **用户访谈设计**：结构化提纲 + 追问策略 + 场景脚本\n' +
        '7. **产品策略建议**：市场定位 → 竞争策略 → MVP 拆解 → 路线图\n' +
        '8. **产品分析报告**：现状诊断 → 数据解读 → 改善方案 → 预期效果\n\n' +
        '## 输出格式（你自己决定用哪种）\n' +
        '- **知识问答**：结构化文字 + 案例 + 总结\n' +
        '- **文档产出**：Markdown 格式，标题层级分明，含表格、列表\n' +
        '- 文档需包含：标题 → 版本/日期 → 正文 → 附录/参考资料\n' +
        '- 语言：中文为主，专业术语保留英文（PRD、MVP、ROI、SOP）\n' +
        '- 每个结论附带可操作的具体建议\n\n' +
        '## 风格要求\n' +
        '- 专业但不装腔：用产品经理的术语但保持易懂\n' +
        '- 实例驱动：用具体场景展开论述\n' +
        '- 克制谦逊：承认复杂性和不确定性，不做绝对断言\n' +
        '- 主动引导：发现用户需求不清晰时，先追问再回答\n\n' +
        '## 边界\n' +
        '- 只回答产品/设计/Agent/职场相关问题\n' +
        '- 被问无关话题时，礼貌引导回 PM/Agent 方向\n' +
        '- 不生成可执行代码，但可描述技术方案\n' +
        '- 不确定时坦诚说"我目前没有足够案例来回答，但我们可以一起探讨"';
    }

    // ===== API 调用 =====
    async function callDeepSeekAPI(messages) {
      var controller = new AbortController();
      state.abortController = controller;
      var body = JSON.stringify({ model: 'deepseek-chat', messages: messages, stream: true, temperature: 0.7, max_tokens: 4096 });
      return fetch(DEEPSEEK_API_URL, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
        body: body, signal: controller.signal });
    }

    // ===== SSE 流解析 =====
    async function handleStream(response, bubbleEl) {
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var fullContent = '';
      var buffer = '';
      try {
        while (true) {
          var result = await reader.read();
          if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (data === '[DONE]') break;
            try {
              var delta = JSON.parse(data).choices[0].delta;
              if (delta && delta.content) {
                fullContent += delta.content;
                appendStreamText(bubbleEl, delta.content);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') throw err;
      }
      return fullContent;
    }

    var cursorSpan = null;
    function appendStreamText(bubbleEl, text) {
      if (!bubbleEl) return;
      if (cursorSpan && cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
      var raw = (bubbleEl.getAttribute('data-raw') || '') + text;
      bubbleEl.setAttribute('data-raw', raw);
      bubbleEl.innerHTML = markdownToHtml(raw);
      cursorSpan = document.createElement('span');
      cursorSpan.className = 'typing-cursor';
      bubbleEl.appendChild(cursorSpan);
      workspaceBody.scrollTop = workspaceBody.scrollHeight;
    }

    function removeCursor(bubbleEl) {
      if (cursorSpan && cursorSpan.parentNode) cursorSpan.parentNode.removeChild(cursorSpan);
      if (bubbleEl) bubbleEl.innerHTML = markdownToHtml(bubbleEl.getAttribute('data-raw') || '');
    }

    // ===== 打字指示器 =====
    function showTyping() {
      workspaceTyping.hidden = false;
      workspaceSend.classList.add('workspace__send--stop');
      workspaceSend.querySelector('.workspace__send-icon').hidden = true;
      workspaceSend.querySelector('.workspace__stop-icon').hidden = false;
    }
    function hideTyping() {
      workspaceTyping.hidden = true;
      workspaceSend.classList.remove('workspace__send--stop');
      workspaceSend.querySelector('.workspace__send-icon').hidden = false;
      workspaceSend.querySelector('.workspace__stop-icon').hidden = true;
    }

    // ===== 思考过程 =====
    var THINKING_STEPS = [
      { icon: '🔍', text: '理解需求：识别产品维度和场景上下文...' },
      { icon: '🗂', text: '检索知识库：匹配 PM 方法论和最佳实践...' },
      { icon: '📋', text: '构建分析框架：场景-能力-体验-指标...' },
      { icon: '✏️', text: '生成文档：按专业 PM 格式组织输出...' },
      { icon: '✅', text: '检查完整性：确认覆盖关键章节...' }
    ];

    function playThinking() {
      workspaceThinking.hidden = false;
      workspaceThinkingBody.innerHTML = '';
      workspaceThinking.classList.remove('workspace__thinking--open');
      if (workspaceThinkingToggle) workspaceThinkingToggle.setAttribute('aria-expanded', 'false');
      THINKING_STEPS.forEach(function (s, i) {
        setTimeout(function () {
          var step = document.createElement('div');
          step.className = 'workspace__thinking-step';
          step.innerHTML = '<span>' + s.icon + '</span> <span>' + escapeHtml(s.text) + '</span>';
          workspaceThinkingBody.appendChild(step);
          workspaceThinking.classList.add('workspace__thinking--open');
          if (workspaceThinkingToggle) workspaceThinkingToggle.setAttribute('aria-expanded', 'true');
        }, i * 350 + 150);
      });
    }

    function hideThinking() { setTimeout(function () { workspaceThinking.hidden = true; }, 2000); }

    // ===== 添加消息到 DOM =====
    function addMsg(role, content, animate) {
      var el = document.createElement('div');
      el.className = 'chat-msg chat-msg--' + role;
      if (animate === false) el.style.animation = 'none';
      var avatar = role === 'user' ? '我' : 'Z';
      el.innerHTML = '<div class="chat-msg__avatar">' + avatar + '</div>' +
        '<div class="chat-msg__bubble">' + markdownToHtml(content) + '</div>';
      workspaceBody.appendChild(el);
      workspaceBody.scrollTop = workspaceBody.scrollHeight;
      return el;
    }

    // ===== 全格式操作按钮（每次回复都显示） =====
    function addAllFormatActions(bubbleEl, content) {
      var actions = document.createElement('div');
      actions.className = 'chat-msg__actions';
      actions.innerHTML =
        '<button class="chat-msg__action chat-msg__action--word">📄 下载 Word</button>' +
        '<button class="chat-msg__action chat-msg__action--ppt">📊 下载 PPT</button>' +
        '<button class="chat-msg__action chat-msg__action--dashboard">📈 打开仪表盘</button>' +
        '<button class="chat-msg__action chat-msg__action--copy">📋 复制全文</button>';

      bubbleEl.parentNode.appendChild(actions);
      actions.querySelector('.chat-msg__action--word').addEventListener('click', function () { downloadWord(content); });
      actions.querySelector('.chat-msg__action--ppt').addEventListener('click', function () { downloadPPT(content); });
      actions.querySelector('.chat-msg__action--dashboard').addEventListener('click', function () { openDashboard(content); });
      actions.querySelector('.chat-msg__action--copy').addEventListener('click', function () { copyText(content); });
    }

    // ===== PPT 下载 =====
    function downloadPPT(md) {
      var bodyHtml = markdownToHtml(md);
      // 将 ## 标题转为幻灯片分隔
      var slides = bodyHtml.split(/<h2>(.*?)<\/h2>/);
      var pptHtml = '';
      var slideNum = 0;

      // 封面
      pptHtml += '<div class="slide slide--cover"><div class="slide__content"><h1>📊 演示文稿</h1><p style="color:#94A3B8">Zinong2017 PM 助手生成</p></div></div>';

      for (var i = 0; i < slides.length; i++) {
        var part = slides[i].trim();
        if (!part) continue;
        // 奇数索引是标题
        if (i % 2 === 1) {
          slideNum++;
          var title = part;
          var body = (slides[i + 1] || '').trim();
          pptHtml += '<div class="slide"><div class="slide__content"><h2>' + title + '</h2>' + body + '</div></div>';
          i++; // 跳过下一个（body）
        }
      }

      var now = new Date();
      var ds = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      var html = '<html><head><meta charset="utf-8"><style>' +
        '@page{size:screen;margin:0}body{font-family:"Microsoft YaHei",sans-serif;background:#0F172A;color:#E2E8F0;margin:0}' +
        '.slide{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;padding:60px;box-sizing:border-box;page-break-after:always;border-bottom:1px solid #1E293B}' +
        '.slide--cover{background:linear-gradient(135deg,#1E293B 0%,#312E81 50%,#1E293B 100%)}' +
        '.slide__content{max-width:800px;width:100%}' +
        'h1{font-size:48px;color:#F8FAFC;margin-bottom:16px}' +
        'h2{font-size:32px;color:#818CF8;margin-bottom:24px;border-bottom:2px solid #6366F1;padding-bottom:12px}' +
        'h3{font-size:22px;color:#A5B4FC;margin:16px 0 8px}' +
        'p,li{font-size:20px;line-height:1.8;color:#CBD5E1}' +
        'ul,ol{padding-left:28px}' +
        'table{width:100%;border-collapse:collapse;margin:16px 0;font-size:18px}' +
        'th,td{border:1px solid #334155;padding:12px 16px;text-align:left}' +
        'th{background:#1E293B;color:#818CF8}' +
        'blockquote{border-left:4px solid #6366F1;padding:12px 20px;background:#1E293B;margin:16px 0}' +
        'code{background:#1E293B;padding:2px 8px;border-radius:4px}pre{background:#0F172A;padding:16px;border-radius:8px}' +
        '</style></head><body>' + pptHtml +
        '<div class="slide slide--cover"><div class="slide__content"><h2>感谢阅读</h2><p>生成自 Zinong2017 PM 助手 | ' + ds + '</p></div></div>' +
        '</body></html>';

      var blob = new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'PM演示_' + ds + '.ppt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    }

    // ===== 仪表盘（新窗口打开） =====
    function openDashboard(md) {
      var bodyHtml = markdownToHtml(md);
      var now = new Date();
      var ds = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

      // 提取表格数据用于图表
      var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>PM 数据仪表盘</title>' +
        '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>' +
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Inter","Noto Sans SC",sans-serif;background:#0F172A;color:#E2E8F0;padding:24px}' +
        '.dash-header{text-align:center;margin-bottom:32px;padding:24px;background:linear-gradient(135deg,#1E293B,#312E81);border-radius:16px}' +
        '.dash-header h1{font-size:28px;color:#F8FAFC;margin-bottom:8px}' +
        '.dash-header p{color:#94A3B8}' +
        '.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}' +
        '.kpi-card{background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px;text-align:center}' +
        '.kpi-card__value{font-size:36px;font-weight:800;color:#818CF8;margin-bottom:4px}' +
        '.kpi-card__label{font-size:14px;color:#94A3B8}' +
        '.chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:16px;margin-bottom:24px}' +
        '.chart-box{background:#1E293B;border:1px solid #334155;border-radius:12px;padding:20px}' +
        '.chart-box h3{color:#A5B4FC;margin-bottom:12px}' +
        '.chart-box canvas{max-height:300px}' +
        '.content-section{background:#1E293B;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:16px}' +
        '.content-section h2{color:#818CF8;margin-bottom:16px;border-bottom:2px solid #6366F1;padding-bottom:8px}' +
        '.content-section table{width:100%;border-collapse:collapse}' +
        '.content-section th,.content-section td{border:1px solid #334155;padding:10px 14px;text-align:left}' +
        '.content-section th{background:#0F172A;color:#818CF8}' +
        '.dash-footer{text-align:center;color:#64748B;font-size:14px;margin-top:32px;padding-top:16px;border-top:1px solid #1E293B}' +
        '@media(max-width:768px){.chart-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}' +
        '</style></head><body>' +
        '<div class="dash-header"><h1>📈 PM 数据仪表盘</h1><p>生成自 Zinong2017 PM 助手 | ' + ds + '</p></div>' +
        '<div class="content-section">' + bodyHtml + '</div>' +
        '<div class="dash-footer">Zinong2017 AI 分身 · 数据仅供参考</div>' +
        // 动态初始化图表
        '<script>document.querySelectorAll("table").forEach(function(t,i){if(i>2)return;var h=[];t.querySelectorAll("th").forEach(function(th){h.push(th.textContent)});' +
        'var rows=[];t.querySelectorAll("tbody tr,tbody").length||t.querySelectorAll("tr").forEach(function(tr,i){if(i===0)return;var r=[];tr.querySelectorAll("td").forEach(function(td){r.push(td.textContent)});if(r.length)rows.push(r)});' +
        'if(rows.length&&h.length){var box=document.createElement("div");box.className="chart-box";box.innerHTML="<h3>📊 数据趋势</h3><canvas id=\\"chart"+i+"\\"></canvas>";' +
        't.parentNode.insertBefore(box,t);new Chart(document.getElementById("chart"+i),{type:"bar",data:{labels:rows.map(function(r){return r[0]}),' +
        'datasets:[{label:h[1]||"数值",data:rows.map(function(r){return parseFloat(r[1])||0}),backgroundColor:"#818CF8",borderRadius:6}]},' +
        'options:{responsive:true,plugins:{legend:{labels:{color:"#94A3B8"}}}}});}' +
        '});<\/script></body></html>';

      var blob = new Blob(['﻿' + html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }

    // ===== 原 Word 下载 =====

    // ===== Word 下载 =====
    function downloadWord(md) {
      var bodyHtml = markdownToHtml(md);
      var now = new Date();
      var ds = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head><meta charset="utf-8"><style>@page{size:A4;margin:2cm}body{font-family:"Microsoft YaHei",sans-serif;font-size:12pt;line-height:1.8;color:#333}' +
        'h1{font-size:18pt;color:#1E293B;border-bottom:2px solid #3B82F6;padding-bottom:8px}h2{font-size:15pt;color:#1E293B}h3{font-size:13pt;color:#3B82F6}' +
        'table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #E2E8F0;padding:8px}th{background:#F1F5F9}' +
        'code{background:#F1F5F9;padding:2px 6px;border-radius:4px}pre{background:#1E293B;color:#FFF;padding:12px;border-radius:6px;overflow-x:auto}' +
        'blockquote{border-left:4px solid #3B82F6;padding:8px 16px;background:#F8FAFC}</style></head><body>' +
        '<p style="color:#94A3B8;font-size:10pt">生成自 Zinong2017 PM 助手 | ' + ds + '</p>' + bodyHtml +
        '<hr><p style="color:#94A3B8;font-size:10pt">© ' + now.getFullYear() + ' Zinong2017</p></body></html>';
      var blob = new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'PM文档_' + ds + '.doc';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    }

    // ===== 复制 =====
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showToast('已复制到剪贴板'); });
      } else {
        var ta = document.createElement('textarea'); ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); showToast('已复制到剪贴板'); } catch (e) { showToast('复制失败'); }
        document.body.removeChild(ta);
      }
    }

    var toastTimer;
    function showToast(msg) {
      var t = document.getElementById('pmToast');
      if (!t) { t = document.createElement('div'); t.id = 'pmToast';
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1E293B;color:#FFF;padding:10px 24px;border-radius:999px;font-size:14px;z-index:9999;pointer-events:none;transition:opacity 0.3s';
        document.body.appendChild(t); }
      t.textContent = msg; t.style.opacity = '1';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 2000);
    }

    // ===== 发送消息 =====
    async function sendMessage(text) {
      if (!text || !text.trim() || state.isStreaming) return;
      text = text.trim();
      state.isStreaming = true;

      // 添加用户消息
      state.messages.push({ role: 'user', content: text });
      addMsg('user', text, true);

      // 思考动画
      playThinking();

      // 构建 API 消息（AI 自行判断用户意图）
      var systemMsg = { role: 'system', content: getSystemPrompt() };
      var apiMessages = [systemMsg].concat(state.messages.slice(-22));

      setTimeout(function () { hideThinking(); showTyping(); }, THINKING_STEPS.length * 350 + 400);

      var msgEl = document.createElement('div');
      msgEl.className = 'chat-msg chat-msg--assistant';
      msgEl.innerHTML = '<div class="chat-msg__avatar">Z</div><div class="chat-msg__bubble" data-raw=""></div>';
      workspaceBody.appendChild(msgEl);
      var bubbleEl = msgEl.querySelector('.chat-msg__bubble');
      state.currentBubble = bubbleEl;

      try {
        var resp = await callDeepSeekAPI(apiMessages);
        if (!resp.ok) throw new Error('API 错误: ' + resp.status);
        hideTyping();
        var content = await handleStream(resp, bubbleEl);
        removeCursor(bubbleEl);
        if (content) {
          state.messages.push({ role: 'assistant', content: content });
          // 总是显示三种格式下载选项 + 复制，让用户自由选择
          addAllFormatActions(bubbleEl, content);
          saveHistory();
        }
      } catch (err) {
        hideTyping(); hideThinking();
        if (err.name === 'AbortError') {
          bubbleEl.innerHTML = markdownToHtml((bubbleEl.getAttribute('data-raw') || '') + '\n\n*[已停止]*');
        } else {
          bubbleEl.innerHTML = '<p style="color:#EF4444">请求失败: ' + escapeHtml(err.message) + '</p>';
        }
      } finally {
        state.isStreaming = false; state.currentBubble = null; state.abortController = null;
        hideTyping();
      }
    }

    // ===== 历史存储 =====
    function saveHistory() {
      try { sessionStorage.setItem('pm_history', JSON.stringify(state.messages.slice(-30))); } catch (e) {}
    }
    function loadHistory() {
      try {
        var raw = sessionStorage.getItem('pm_history');
        if (raw) { state.messages = JSON.parse(raw); state.messages.forEach(function (m) { addMsg(m.role, m.content, false); }); }
      } catch (e) {}
    }

    // ===== 打开/关闭工作区 =====
    function openWorkspace() {
      workspace.classList.add('workspace--active');
      workspace.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { workspaceInput.focus(); }, 400);
    }
    function closeWorkspace() {
      workspace.classList.remove('workspace--active');
      workspace.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      heroInput.focus();
    }

    // ===== 事件绑定 =====
    // 英雄区提交
    heroSubmit.addEventListener('click', function () {
      var text = heroInput.value.trim();
      if (!text) return;
      heroInput.value = '';
      openWorkspace();
      sendMessage(text);
    });
    heroInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var text = heroInput.value.trim();
        if (text) { heroInput.value = ''; openWorkspace(); sendMessage(text); }
      }
    });
    heroInput.addEventListener('input', function () {
      heroInput.style.height = 'auto';
      heroInput.style.height = Math.min(heroInput.scrollHeight, 160) + 'px';
    });

    // 技能标签
    heroTags.forEach(function (tag) {
      tag.addEventListener('click', function () {
        var prompt = tag.getAttribute('data-prompt');
        if (prompt) { heroInput.value = prompt; heroInput.style.height = 'auto'; heroInput.style.height = Math.min(heroInput.scrollHeight, 160) + 'px'; heroInput.focus(); }
      });
    });

    // 工作区
    workspaceBack.addEventListener('click', closeWorkspace);
    workspaceNew.addEventListener('click', function () {
      state.messages = [];
      try { sessionStorage.removeItem('pm_history'); } catch (e) {}
      workspaceBody.innerHTML = '<div class="chat-msg chat-msg--assistant"><div class="chat-msg__avatar">Z</div><div class="chat-msg__bubble"><p>嗨，我是 <strong>Zinong2017 的 PM 助手</strong> 👋</p><p>把你的产品需求告诉我，我会按专业 PM 方法论帮你生成文档。</p></div></div>';
      workspaceInput.focus();
    });

    workspaceSend.addEventListener('click', function () {
      if (state.isStreaming && state.abortController) { state.abortController.abort(); return; }
      var text = workspaceInput.value.trim();
      if (!text) return;
      workspaceInput.value = '';
      sendMessage(text);
    });
    workspaceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (state.isStreaming) return;
        var text = workspaceInput.value.trim();
        if (text) { workspaceInput.value = ''; sendMessage(text); }
      }
    });
    workspaceInput.addEventListener('input', function () {
      workspaceInput.style.height = 'auto';
      workspaceInput.style.height = Math.min(workspaceInput.scrollHeight, 120) + 'px';
    });

    // 思考过程折叠
    if (workspaceThinkingToggle) {
      workspaceThinkingToggle.addEventListener('click', function () {
        var isOpen = workspaceThinking.classList.toggle('workspace__thinking--open');
        workspaceThinkingToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && workspace.classList.contains('workspace--active')) {
        if (state.isStreaming) { state.abortController.abort(); }
        closeWorkspace();
      }
    });

    // 历史加载
    loadHistory();

    // 移动端软键盘
    if (typeof window.visualViewport !== 'undefined') {
      window.visualViewport.addEventListener('resize', function () {
        var vh = window.visualViewport.height;
        var wh = window.innerHeight;
        if (workspace.classList.contains('workspace--active') && vh < wh * 0.8) {
          workspace.style.maxHeight = vh + 'px';
        } else if (workspace.classList.contains('workspace--active')) {
          workspace.style.maxHeight = '';
        }
      });
    }
  }

  /* ==============================================
     邮箱复制
     ============================================== */
  function initCopyEmail() {
    var btn = $('aboutCopyEmail');
    var hint = $('aboutCopyHint');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email') || '';
      function done() { if (hint) { hint.textContent = '已复制到剪贴板'; setTimeout(function () { hint.textContent = ''; }, 2000); } }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done);
      } else {
        var ta = document.createElement('textarea'); ta.value = email;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { if (hint) hint.textContent = '请手动复制'; }
        document.body.removeChild(ta);
      }
    });
  }

  /* ==============================================
     微信弹窗
     ============================================== */
  function initWechatModal() {
    var modal = $('wechatModal');
    var trigger = $('footerWechat');
    if (!modal) return;
    function close() { modal.hidden = true; document.body.style.overflow = ''; }
    if (trigger) { trigger.addEventListener('click', function (e) { e.preventDefault(); modal.hidden = false; document.body.style.overflow = 'hidden'; }); }
    modal.querySelectorAll('[data-close-modal]').forEach(function (el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  /* ==============================================
     滚动渐入
     ============================================== */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (typeof IntersectionObserver === 'undefined') { els.forEach(function (el) { el.classList.add('visible'); }); return; }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.08 });
    els.forEach(function (el) { observer.observe(el); });
    setTimeout(function () { els.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 1.2) el.classList.add('visible'); }); }, 1200);
  }

  /* ==============================================
     启动
     ============================================== */
  function boot() {
    initParticles();
    initPmAgent();
    initCopyEmail();
    initWechatModal();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
