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

    // ===== 系统提示词 =====
    function getSystemPrompt() {
      return '你是 Zinong2017 的 AI 数字分身，一名专注 AI Agent 方向的产品经理。\n\n' +
        '## 你的 PM 技能\n' +
        '1. **PRD 撰写**：背景与目标 → 用户故事 → 功能需求(P0/P1/P2) → 非功能需求 → 指标体系 → 排期与风险\n' +
        '2. **竞品分析**：从功能、体验、定位、商业模式四维度对比，给出差异化建议\n' +
        '3. **需求拆解**：用户故事 + 功能点 + 优先级(MoSCoW) + 依赖关系\n' +
        '4. **产品方案评审**：可行性、风险、体验三角度评估，输出风险矩阵和改进建议\n' +
        '5. **指标设计**：北极星指标 + 过程指标 + 质量指标三层体系\n' +
        '6. **用户访谈设计**：结构化提纲 + 追问策略\n\n' +
        '## 输出格式\n' +
        '- 使用 Markdown 组织文档（标题层级、列表、表格）\n' +
        '- 文档结构：标题 → 版本信息 → 正文 → 参考资料\n' +
        '- 中文为主，专业术语可保留英文\n' +
        '- 每个结论附带可操作的下一步建议\n\n' +
        '## 边界\n' +
        '- 只回答产品/设计/Agent 相关问题\n' +
        '- 不确定时坦诚说明，建议用户补充信息';
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

    // ===== 添加操作按钮 =====
    function addActions(bubbleEl, content) {
      var actions = document.createElement('div');
      actions.className = 'chat-msg__actions';
      actions.innerHTML = '<button class="chat-msg__action chat-msg__action--download">📥 下载 Word</button>' +
                          '<button class="chat-msg__action chat-msg__action--copy">📋 复制全文</button>';
      bubbleEl.parentNode.appendChild(actions);
      actions.querySelector('.chat-msg__action--download').addEventListener('click', function () { downloadWord(content); });
      actions.querySelector('.chat-msg__action--copy').addEventListener('click', function () { copyText(content); });
    }

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

      state.messages.push({ role: 'user', content: text });
      addMsg('user', text, true);

      playThinking();

      var systemMsg = { role: 'system', content: getSystemPrompt() };
      var apiMessages = [systemMsg].concat(state.messages.slice(-20));

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
          addActions(bubbleEl, content);
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
