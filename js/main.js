(function () {
  'use strict';

  document.documentElement.classList.add('js-ready');

  function toggleClass(el, className, force) {
    if (!el) return;
    if (typeof force === 'boolean') {
      if (force) el.classList.add(className);
      else el.classList.remove(className);
    } else {
      el.classList.toggle(className);
    }
  }

  var NAV_SCROLL_THRESHOLD = 100;
  var CAROUSEL_INTERVAL = 5000;
  var NAV_HEIGHT = 68;

  function $(id) {
    return document.getElementById(id);
  }

  function safe(fn) {
    try {
      fn();
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Zinong2017]', err);
      }
    }
  }

  function getNavOffset() {
    var val = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
      10
    );
    return isNaN(val) ? NAV_HEIGHT : val;
  }

  function initNavbar() {
    var navbar = $('navbar');
    if (!navbar) return;

    function updateNavbar() {
      if (window.scrollY > NAV_SCROLL_THRESHOLD) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
  }

  function initNavScroll() {
    var navLinks = document.querySelectorAll('.nav-link, .mobile-nav__link');

    function setActiveNav(id) {
      navLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        toggleClass(link, 'active', href === '#' + id);
      });
    }

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          var top = target.getBoundingClientRect().top + window.pageYOffset - getNavOffset();
          if (window.scrollTo) {
            try {
              window.scrollTo({ top: top, behavior: 'smooth' });
            } catch (err) {
              window.scrollTo(0, top);
            }
          } else {
            window.scrollTo(0, top);
          }
        }
        closeMobileNav();
      });
    });

    if (typeof IntersectionObserver === 'undefined') return;

    var observerNav = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        });
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: 0 }
    );

    document.querySelectorAll('#hero, #about, #works, #journal, #contact, #footer').forEach(function (el) {
      if (el.id) observerNav.observe(el);
    });
  }

  var hamburgerBtn = $('hamburgerBtn');
  var mobileNav = $('mobileNav');

  function closeMobileNav() {
    if (!hamburgerBtn || !mobileNav) return;
    hamburgerBtn.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initMobileNav() {
    if (!hamburgerBtn || !mobileNav) return;

    hamburgerBtn.addEventListener('click', function () {
      var isOpen = !mobileNav.classList.contains('open');
      toggleClass(mobileNav, 'open', isOpen);
      toggleClass(hamburgerBtn, 'open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      mobileNav.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  function initCarousel() {
    var slides = document.querySelectorAll('.carousel__slide');
    var dotsContainer = $('carouselDots');
    var prevBtn = $('carouselPrev');
    var nextBtn = $('carouselNext');
    var carousel = $('carousel');

    if (!slides.length || !dotsContainer || !carousel) return;

    var currentIndex = 0;
    var autoplayTimer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 张');
      dot.addEventListener('click', function () {
        goToSlide(i);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });

    var dots = dotsContainer.querySelectorAll('.carousel__dot');

    function lazyLoadSlide(slide) {
      var img = slide.querySelector('.carousel__img');
      if (img && img.getAttribute('data-src')) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      }
    }

    function goToSlide(index) {
      currentIndex = (index + slides.length) % slides.length;
      for (var i = 0; i < slides.length; i++) {
        toggleClass(slides[i], 'active', i === currentIndex);
      }
      for (var j = 0; j < dots.length; j++) {
        toggleClass(dots[j], 'active', j === currentIndex);
      }
      lazyLoadSlide(slides[currentIndex]);
      var next = slides[(currentIndex + 1) % slides.length];
      if (next) lazyLoadSlide(next);
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function resetAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        prevSlide();
        resetAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        nextSlide();
        resetAutoplay();
      });
    }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    
    // 移动端触摸滑动支持
    var touchStartX = 0;
    var touchEndX = 0;
    var touchStartY = 0;
    var touchEndY = 0;
    var isTouching = false;
    
    carousel.addEventListener('touchstart', function(e) {
      stopAutoplay();
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      isTouching = true;
    }, { passive: true });
    
    carousel.addEventListener('touchmove', function(e) {
      if (!isTouching) return;
      // 防止垂直滚动干扰
      var currentY = e.changedTouches[0].screenY;
      var deltaY = Math.abs(currentY - touchStartY);
      var currentX = e.changedTouches[0].screenX;
      var deltaX = Math.abs(currentX - touchStartX);
      
      // 水平滑动大于垂直滑动时，阻止默认滚动
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }, { passive: false });
    
    carousel.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      isTouching = false;
      
      var deltaX = touchEndX - touchStartX;
      var deltaY = touchEndY - touchStartY;
      
      // 判断是否为水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX < 0) {
          // 向左滑动，下一张
          nextSlide();
        } else {
          // 向右滑动，上一张
          prevSlide();
        }
        resetAutoplay();
      } else {
        setTimeout(startAutoplay, 3000);
      }
    }, { passive: true });

    startAutoplay();
  }

  function initReveal() {
    var revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      revealEls.forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px 0px 0px' }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    /* 首屏下方内容：延迟兜底显示，防止部分手机浏览器 IO 不触发 */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.2) {
          el.classList.add('visible');
        }
      });
    }, 1200);
  }

  function initLightbox() {
    var lightbox = $('lightbox');
    var lightboxImg = $('lightboxImg');
    var lightboxClose = $('lightboxClose');
    if (!lightbox || !lightboxImg) return;

    document.querySelectorAll('.gallery__item').forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img');
        var src = item.getAttribute('data-full') || (img && img.src) || '';
        lightboxImg.src = src;
        lightboxImg.alt = (img && img.alt) || '预览';
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
      });
    });

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.src = '';
      document.body.style.overflow = '';
    }

    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  function initWechatModal() {
    var wechatModal = $('wechatModal');
    var wechatLink = document.querySelector('[data-wechat]');
    if (!wechatModal) return;

    function closeWechatModal() {
      if (!wechatModal.hidden) {
        wechatModal.hidden = true;
        document.body.style.overflow = '';
      }
    }

    if (wechatLink) {
      wechatLink.addEventListener('click', function (e) {
        e.preventDefault();
        wechatModal.hidden = false;
        document.body.style.overflow = 'hidden';
      });
    }

    wechatModal.querySelectorAll('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', closeWechatModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeWechatModal();
    });
  }

  function initCopyEmail() {
    var copyBtn = $('copyEmail');
    var copyHint = $('copyHint');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email') || '';

      function showCopied() {
        if (copyHint) copyHint.textContent = '已复制到剪贴板';
        setTimeout(function () {
          if (copyHint) copyHint.textContent = '';
        }, 2000);
      }

      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch (err) {
          if (copyHint) copyHint.textContent = '请手动复制';
        }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(showCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  // ============================================
  // PM Agent 工作台
  // ============================================
  function initPmAgent() {
    // ========== API 配置 ==========
    // DeepSeek API（前端直连，无代理层）
    var DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    // 安全提示：此 Key 会出现在前端源码中。个人站点流量小、风险可控。
    // 如需保护 Key，请改用 Cloudflare Worker 代理（见 proxy/worker.js）
    var DEEPSEEK_API_KEY = 'sk-6c4da4b366a840cd9168f1bbbed21f43';

    // CORS 代理（当直接请求被浏览器拦截时使用）
    var CORS_PROXY = 'https://corsproxy.io/?';

    // DOM 引用
    var btn = $('pmAgentBtn');
    var chat = $('pmChat');
    var chatBody = $('pmChatBody');
    var chatInput = $('pmChatInput');
    var chatSend = $('pmChatSend');
    var thinkingEl = $('pmThinking');
    var thinkingBody = $('pmThinkingBody');
    var thinkingToggle = $('pmThinkingToggle');
    var typingEl = $('pmTyping');
    var skillsEl = $('pmSkills');
    var newChatBtn = $('pmChatNewChat');
    var closeBtn = $('pmChatClose');

    if (!btn || !chat) return;

    // ========== 状态管理 ==========
    var state = {
      messages: [],        // 对话历史 [{ role, content, sources, isDocument }]
      isOpen: false,
      isStreaming: false,
      abortController: null,
      currentAssistantBubble: null,  // 当前正在流式写入的 bubble 引用
      pendingDocContent: ''          // 累积中的文档内容（用于下载）
    };

    // ========== 工具函数 ==========

    // HTML 转义
    function escapeHtml(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }

    // Markdown → HTML（使用 marked 库，支持完整 GFM）
    function markdownToHtml(md) {
      if (!md) return '';
      if (typeof marked !== 'undefined' && marked.parse) {
        // 配置 marked：GitHub Flavored Markdown + 安全模式
        marked.setOptions({
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false
        });
        var html = marked.parse(md);
        // 给链接添加 target="_blank"
        html = html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
        return html;
      }
      // 降级：marked 未加载时使用简易渲染
      return md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    // 滚动到底部
    function scrollToBottom() {
      if (chatBody) {
        setTimeout(function () {
          chatBody.scrollTop = chatBody.scrollHeight;
        }, 50);
      }
    }

    // 会话存储
    function saveHistory() {
      try {
        sessionStorage.setItem('pm_chat_history', JSON.stringify(state.messages.slice(-30)));
      } catch (e) { /* 忽略 */ }
    }

    function loadHistory() {
      try {
        var raw = sessionStorage.getItem('pm_chat_history');
        if (raw) {
          state.messages = JSON.parse(raw);
          // 恢复 DOM
          state.messages.forEach(function (msg) {
            appendMessageToDom(msg.role, msg.content, msg.sources, false);
          });
          scrollToBottom();
        }
      } catch (e) { /* 忽略 */ }
    }

    function clearHistory() {
      state.messages = [];
      try { sessionStorage.removeItem('pm_chat_history'); } catch (e) { /* 忽略 */ }
      if (chatBody) {
        // 保留欢迎消息
        chatBody.innerHTML = '<div class="pm-msg pm-msg--assistant"><div class="pm-msg__avatar" aria-hidden="true">Z</div><div class="pm-msg__content"><div class="pm-msg__bubble"><p>嗨，我是 <strong>Zinong2017 的 PM 助手</strong> 👋</p><p>点击上方快捷技能或直接输入需求，我会生成专业文档并支持 <strong>下载 Word</strong> 📥</p></div></div></div>';
      }
    }

    // ========== DOM 渲染 ==========

    // 添加消息到 DOM
    function appendMessageToDom(role, content, sources, animate) {
      if (!chatBody) return null;

      var msgEl = document.createElement('div');
      msgEl.className = 'pm-msg pm-msg--' + role;
      if (animate === false) {
        msgEl.style.animation = 'none';
      }

      var avatarInitial = role === 'user' ? '我' : 'Z';
      var avatarHtml = '<div class="pm-msg__avatar" aria-hidden="true">' + avatarInitial + '</div>';

      var contentHtml = '<div class="pm-msg__content">';
      contentHtml += '<div class="pm-msg__bubble">' + markdownToHtml(content) + '</div>';

      // 搜索引用来源
      if (sources && sources.length > 0) {
        contentHtml += '<div class="pm-msg__sources">📎 参考来源：';
        sources.forEach(function (s, i) {
          contentHtml += '<a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener noreferrer">[' + (i + 1) + '] ' + escapeHtml(s.title) + '</a> ';
        });
        contentHtml += '</div>';
      }

      // 助手消息：操作按钮（下载 Word / 复制）
      if (role === 'assistant' && content && content.length > 100) {
        contentHtml += '<div class="pm-msg__actions">';
        contentHtml += '<button type="button" class="pm-msg__action-btn pm-msg__action-btn--download" data-action="download">📥 下载 Word</button>';
        contentHtml += '<button type="button" class="pm-msg__action-btn pm-msg__action-btn--copy" data-action="copy">📋 复制全文</button>';
        contentHtml += '</div>';
      }

      contentHtml += '</div>';
      msgEl.innerHTML = avatarHtml + contentHtml;

      // 绑定操作按钮事件
      if (role === 'assistant') {
        var downloadBtn = msgEl.querySelector('[data-action="download"]');
        var copyBtn = msgEl.querySelector('[data-action="copy"]');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', function () {
            downloadAsWord(content);
          });
        }
        if (copyBtn) {
          copyBtn.addEventListener('click', function () {
            copyFullText(content);
          });
        }
      }

      chatBody.appendChild(msgEl);
      return msgEl;
    }

    // ========== Word 文档生成 ==========

    function downloadAsWord(markdownContent) {
      // 将 Markdown 转为适合 Word 的 HTML
      var bodyHtml = markdownToHtml(markdownContent);

      // 生成时间戳
      var now = new Date();
      var dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

      // 完整的 Word 兼容 HTML 文档
      var docHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
        'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
        'xmlns="http://www.w3.org/TR/REC-html40">\n' +
        '<head>\n' +
        '<meta charset="utf-8">\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n' +
        '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>' +
        '<w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->\n' +
        '<style>\n' +
        '@page { size: A4; margin: 2cm; }\n' +
        'body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; ' +
        'font-size: 12pt; line-height: 1.8; color: #333; }\n' +
        'h1 { font-size: 18pt; color: #2D3748; border-bottom: 2px solid #4299E1; ' +
        'padding-bottom: 8px; margin-top: 20px; }\n' +
        'h2 { font-size: 15pt; color: #2D3748; margin-top: 16px; }\n' +
        'h3 { font-size: 13pt; color: #4299E1; margin-top: 14px; }\n' +
        'h4 { font-size: 12pt; color: #718096; margin-top: 12px; }\n' +
        'p { margin: 8px 0; }\n' +
        'ul, ol { margin: 8px 0; padding-left: 24px; }\n' +
        'li { margin: 4px 0; }\n' +
        'table { border-collapse: collapse; width: 100%; margin: 12px 0; }\n' +
        'th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: left; }\n' +
        'th { background: #EDF2F7; font-weight: bold; }\n' +
        'blockquote { border-left: 4px solid #4299E1; padding: 8px 16px; ' +
        'margin: 12px 0; color: #718096; background: #F7FAFC; }\n' +
        'code { background: #EDF2F7; padding: 2px 6px; border-radius: 4px; ' +
        'font-family: "SF Mono", Consolas, monospace; font-size: 10pt; }\n' +
        'pre { background: #2D3748; color: #FFF; padding: 12px; ' +
        'border-radius: 6px; font-size: 10pt; overflow-x: auto; }\n' +
        'pre code { background: none; padding: 0; color: inherit; }\n' +
        'hr { border: none; border-top: 1px solid #E2E8F0; margin: 16px 0; }\n' +
        '.doc-meta { color: #A0AEC0; font-size: 10pt; margin-bottom: 24px; ' +
        'border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; }\n' +
        '</style>\n</head>\n<body>\n' +
        '<div class="doc-meta">\n' +
        '<p>生成自 Zinong2017 PM 助手 | ' + dateStr + '</p>\n' +
        '<p>个人站点：zinong2017.github.io</p>\n' +
        '</div>\n' +
        bodyHtml + '\n' +
        '<hr>\n' +
        '<p style="color:#A0AEC0;font-size:10pt;">本文档由 Zinong2017 AI 分身自动生成，内容仅供参考。' +
        '© ' + now.getFullYear() + ' Zinong2017</p>\n' +
        '</body>\n</html>';

      // 生成 Blob 并触发下载（Word 能打开 .doc 文件）
      var blob = new Blob(['﻿' + docHtml], {
        type: 'application/msword;charset=utf-8'
      });

      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      // 生成有意义的文件名
      var filename = 'PM文档_' + dateStr + '.doc';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // ========== 复制全文 ==========

    function copyFullText(text) {
      function doCopy() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopyToast('已复制全文 ✅');
        } catch (err) {
          showCopyToast('复制失败，请手动选择文字');
        }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showCopyToast('已复制全文 ✅');
        }).catch(doCopy);
      } else {
        doCopy();
      }
    }

    // Toast 提示
    var toastTimer = null;
    function showCopyToast(msg) {
      var toast = document.getElementById('pmCopyToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pmCopyToast';
        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);' +
          'background:#2D3748;color:#FFF;padding:10px 24px;border-radius:999px;' +
          'font-size:14px;z-index:3000;pointer-events:none;transition:opacity 0.3s;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.opacity = '1';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.style.opacity = '0';
      }, 2000);
    }

    // ========== 思考过程 ==========

    // PM 思考步骤预设
    var THINKING_STEPS = [
      { icon: '🔍', text: '理解需求：识别用户关注的产品维度和场景上下文...' },
      { icon: '🗂', text: '检索知识库：匹配 PM 方法论和最佳实践框架...' },
      { icon: '📋', text: '构建分析框架：组织场景-能力-体验-指标分析链...' },
      { icon: '🧩', text: '关联案例：匹配相关产品设计实例和行业参考...' },
      { icon: '✏️', text: '生成文档：按专业 PM 格式组织输出内容...' },
      { icon: '✅', text: '检查完整性：确保覆盖背景/目标/功能/指标/排期...' }
    ];

    function showThinking() {
      if (!thinkingEl || !thinkingBody) return;
      thinkingEl.hidden = false;
      thinkingBody.innerHTML = '';
      thinkingEl.classList.remove('pm-thinking--open');
      if (thinkingToggle) {
        thinkingToggle.setAttribute('aria-expanded', 'false');
      }
    }

    function addThinkingStep(icon, text, delay) {
      if (!thinkingBody) return;
      setTimeout(function () {
        var step = document.createElement('div');
        step.className = 'pm-thinking-step';
        step.innerHTML = '<span class="pm-thinking-step__icon">' + icon + '</span>' +
                         '<span>' + escapeHtml(text) + '</span>';
        thinkingBody.appendChild(step);
        // 自动展开
        if (thinkingEl && thinkingToggle) {
          thinkingEl.classList.add('pm-thinking--open');
          thinkingToggle.setAttribute('aria-expanded', 'true');
        }
      }, delay || 0);
    }

    function hideThinking() {
      if (!thinkingEl) return;
      // 延迟隐藏，让用户看到完整思考链
      setTimeout(function () {
        thinkingEl.hidden = true;
      }, 2000);
    }

    // 播放思考动画
    function playThinkingAnimation() {
      showThinking();
      THINKING_STEPS.forEach(function (step, i) {
        addThinkingStep(step.icon, step.text, i * 400 + 200);
      });
    }

    // ========== 打字机指示器 ==========

    function showTyping() {
      if (typingEl) typingEl.hidden = false;
      if (chatSend) {
        chatSend.classList.add('pm-chat__send--stop');
        chatSend.querySelector('.pm-chat__send-icon').hidden = true;
        chatSend.querySelector('.pm-chat__stop-icon').hidden = false;
      }
    }

    function hideTyping() {
      if (typingEl) typingEl.hidden = true;
      if (chatSend) {
        chatSend.classList.remove('pm-chat__send--stop');
        chatSend.querySelector('.pm-chat__send-icon').hidden = false;
        chatSend.querySelector('.pm-chat__stop-icon').hidden = true;
      }
    }

    // ========== 核心：流式 API 调用 ==========

    function getSystemPrompt() {
      return '你是 Zinong2017 的 AI 数字分身，一名专注 AI Agent 方向的产品经理。\n\n' +
        '## 你是谁\n' +
        '- 身份：Zinong2017 的 AI 分身，AI Agent 产品经理，产品设计专业背景\n' +
        '- 核心理念：Agent 产品的「可预期性」比「聪明」更重要；设计思维 × 产品方法 × Agent 场景理解\n' +
        '- 能力领域：智能体产品设计、UX/交互设计、产品策略、原型与可视化\n\n' +
        '## 你的 PM 技能\n' +
        '根据用户需求，自动选择最合适的技能输出专业文档：\n\n' +
        '1. **PRD 撰写**：按标准模板输出——\n' +
        '   背景与目标 → 用户故事（含角色/场景） → 功能需求（P0/P1/P2 优先级） → ' +
        '   非功能需求 → 指标体系（北极星+过程+质量） → 排期与风险\n' +
        '2. **竞品分析**：从功能、体验、定位、商业模式四个维度对比，给出差异化建议和行动项\n' +
        '3. **需求拆解**：将高层需求拆为可执行任务，包含用户故事、功能点、优先级（MoSCoW）和依赖关系\n' +
        '4. **产品方案评审**：从可行性、风险、体验三个角度评估，输出风险矩阵和改进建议\n' +
        '5. **指标设计**：输出北极星指标 + 过程指标 + 质量指标三层体系，含衡量方式和目标值\n' +
        '6. **用户访谈设计**：结构化访谈提纲 + 追问策略 + 场景脚本\n\n' +
        '## 输出格式要求\n' +
        '- 使用 Markdown 组织文档结构（标题层级、列表、表格）\n' +
        '- 文档应包含：文档标题 → 版本/日期信息 → 正文（按上述模板） → 附录/参考资料\n' +
        '- 语言：中文，专业术语可保留英文（如 PRD、MVP、KPI、ROI、SOP）\n' +
        '- 如果包含搜索结果引用，在文中用 [来源N] 标注，文末列出参考链接\n' +
        '- 每个结论尽量附带可操作的下一步建议\n\n' +
        '## 回答风格\n' +
        '- 专业结构化：按 PM 文档标准格式输出，善用表格和分点\n' +
        '- 可执行：不给空洞建议，每个结论附带具体可操作步骤\n' +
        '- 适度追问：如果用户需求信息不足（缺少产品背景、目标用户等），先简短追问再动笔\n' +
        '- 展示 Agent 思维：在正式回答前用 1-2 句话说明你选择了什么分析框架\n\n' +
        '## 边界\n' +
        '- 只回答产品/设计/Agent 相关问题\n' +
        '- 不扮演医生、律师等专业角色\n' +
        '- 可描述技术方案但不写具体代码\n' +
        '- 不确定时坦诚说明，并建议用户补充信息';
    }

    // 调用 DeepSeek API（直连，带 CORS 回退）
    async function callDeepSeekAPI(messages) {
      var controller = new AbortController();
      state.abortController = controller;

      var body = JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      });

      // 先尝试直连
      try {
        var resp = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
          },
          body: body,
          signal: controller.signal
        });
        if (resp.ok) return resp;
      } catch (e) {
        // CORS 错误或其他网络问题，尝试 CORS 代理
        if (e.name === 'TypeError' || e.name === 'NetworkError') {
          console.warn('[PM Agent] 直连失败，尝试 CORS 代理...');
        } else {
          throw e;
        }
      }

      // 回退：通过 CORS 代理
      return fetch(CORS_PROXY + encodeURIComponent(DEEPSEEK_API_URL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: body,
        signal: controller.signal
      });
    }

    // SSE 流解析
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
          // 保留最后一个不完整的行
          buffer = lines.pop() || '';

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('data:') !== 0) continue;

            var data = line.slice(5).trim();
            if (data === '[DONE]') break;

            try {
              var json = JSON.parse(data);
              var delta = json.choices && json.choices[0] && json.choices[0].delta;
              if (!delta) continue;

              if (delta.content) {
                fullContent += delta.content;
                // 追加到 DOM
                appendStreamText(bubbleEl, delta.content);
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          throw err;
        }
      }

      return fullContent;
    }

    // 流式追加文本 + 光标
    var cursorSpan = null;
    function appendStreamText(bubbleEl, text) {
      if (!bubbleEl) return;
      // 移除旧光标
      if (cursorSpan && cursorSpan.parentNode) {
        cursorSpan.parentNode.removeChild(cursorSpan);
      }
      // 追加文本节点
      bubbleEl.appendChild(document.createTextNode(text));
      // 重新渲染 Markdown（简单方式是直接更新 innerHTML，但会丢失流式体验）
      // 这里用 innerHTML 重建（对于大段文本可能有闪烁，但确保格式正确）
      var rawText = (bubbleEl.getAttribute('data-raw') || '') + text;
      bubbleEl.setAttribute('data-raw', rawText);
      bubbleEl.innerHTML = markdownToHtml(rawText);
      // 添加闪烁光标
      cursorSpan = document.createElement('span');
      cursorSpan.className = 'typing-cursor';
      bubbleEl.appendChild(cursorSpan);
      scrollToBottom();
    }

    function removeCursor(bubbleEl) {
      if (cursorSpan && cursorSpan.parentNode) {
        cursorSpan.parentNode.removeChild(cursorSpan);
        cursorSpan = null;
      }
      // 最终渲染
      if (bubbleEl) {
        var rawText = bubbleEl.getAttribute('data-raw') || '';
        bubbleEl.innerHTML = markdownToHtml(rawText);
      }
    }

    // ========== 发送消息主流程 ==========

    async function sendMessage(text) {
      if (!text || !text.trim()) return;
      if (state.isStreaming) return;

      text = text.trim();
      state.isStreaming = true;

      // 隐藏技能卡片
      if (skillsEl) skillsEl.style.display = 'none';

      // 添加用户消息
      state.messages.push({ role: 'user', content: text });
      appendMessageToDom('user', text, null, true);
      scrollToBottom();

      // 播放思考动画
      playThinkingAnimation();

      // 构建 messages（不含 system prompt 的历史消息 + 新 system prompt）
      var systemMsg = { role: 'system', content: getSystemPrompt() };
      var apiMessages = [systemMsg].concat(state.messages.slice(-20));

      // 显示打字指示器（在思考动画结束后）
      setTimeout(function () {
        hideThinking();
        showTyping();
      }, THINKING_STEPS.length * 400 + 400);

      // 创建空的助手消息 bubble
      var msgEl = document.createElement('div');
      msgEl.className = 'pm-msg pm-msg--assistant';
      msgEl.innerHTML = '<div class="pm-msg__avatar" aria-hidden="true">Z</div>' +
                        '<div class="pm-msg__content"><div class="pm-msg__bubble" data-raw=""></div></div>';
      if (chatBody) chatBody.appendChild(msgEl);
      var bubbleEl = msgEl.querySelector('.pm-msg__bubble');
      state.currentAssistantBubble = bubbleEl;
      scrollToBottom();

      try {
        // 调用 API（直连 DeepSeek）
        var response = await callDeepSeekAPI(apiMessages);

        if (!response.ok) {
          var errData;
          try { errData = JSON.parse(await response.text()); } catch (e) { errData = { error: 'HTTP ' + response.status }; }
          throw new Error((errData && errData.error) || '请求失败: ' + response.status);
        }

        // 流式读取
        hideTyping();
        var fullContent = await handleStream(response, bubbleEl);
        removeCursor(bubbleEl);

        if (fullContent) {
          // 保存到历史
          state.messages.push({ role: 'assistant', content: fullContent });
          state.pendingDocContent = fullContent;

          // 添加操作按钮（下载 Word / 复制全文）
          var contentDiv = bubbleEl.parentNode;
          var actionsDiv = document.createElement('div');
          actionsDiv.className = 'pm-msg__actions';
          actionsDiv.innerHTML = '<button type="button" class="pm-msg__action-btn pm-msg__action-btn--download" data-action="download">📥 下载 Word</button>' +
                                 '<button type="button" class="pm-msg__action-btn pm-msg__action-btn--copy" data-action="copy">📋 复制全文</button>';
          contentDiv.appendChild(actionsDiv);

          // 绑定按钮事件
          actionsDiv.querySelector('[data-action="download"]').addEventListener('click', function () {
            downloadAsWord(fullContent);
          });
          actionsDiv.querySelector('[data-action="copy"]').addEventListener('click', function () {
            copyFullText(fullContent);
          });

          saveHistory();
        } else {
          // 空响应，可能是被中止
          bubbleEl.innerHTML = '<p style="color:var(--color-muted)">生成已停止。</p>';
        }
      } catch (err) {
        hideTyping();
        hideThinking();
        if (err.name === 'AbortError') {
          // 用户主动停止
          if (bubbleEl) {
            var stoppedText = bubbleEl.getAttribute('data-raw') || '';
            if (stoppedText) {
              bubbleEl.innerHTML = markdownToHtml(stoppedText) +
                '<p style="color:#E53E3E;font-size:12px;margin-top:8px;">⏹ 已停止生成</p>';
              state.messages.push({ role: 'assistant', content: stoppedText + '\n\n*[已停止生成]*' });
            } else {
              bubbleEl.innerHTML = '<p style="color:var(--color-muted)">⏹ 已停止生成</p>';
            }
          }
        } else {
          // 网络或其他错误
          if (bubbleEl) {
            bubbleEl.innerHTML = '<p style="color:#E53E3E;">⚠️ 抱歉，请求失败：' +
              escapeHtml(err.message || '未知错误') + '</p>' +
              '<p style="font-size:12px;color:var(--color-muted);">请检查网络连接后重试。如果问题持续，可能是 DeepSeek API 暂时不可用。</p>';
          }
          console.error('[Zinong2017 PM Agent]', err);
        }
        saveHistory();
      } finally {
        state.isStreaming = false;
        state.currentAssistantBubble = null;
        state.abortController = null;
        hideTyping();
        hideThinking();
        // 检查是否显示技能卡片
        if (skillsEl && state.messages.length <= 1) {
          skillsEl.style.display = '';
        }
      }
    }

    // ========== 事件绑定 ==========

    // 打开/关闭面板
    function openPanel() {
      state.isOpen = true;
      btn.classList.add('pm-agent-btn--open');
      chat.classList.add('pm-chat--visible');
      chat.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (chatInput) {
        setTimeout(function () { chatInput.focus(); }, 300);
      }
      scrollToBottom();
    }

    function closePanel() {
      state.isOpen = false;
      btn.classList.remove('pm-agent-btn--open');
      chat.classList.remove('pm-chat--visible');
      chat.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function togglePanel() {
      if (state.isOpen) {
        closePanel();
      } else {
        openPanel();
      }
    }

    // 悬浮按钮点击
    btn.addEventListener('click', togglePanel);

    // 关闭按钮
    if (closeBtn) {
      closeBtn.addEventListener('click', closePanel);
    }

    // 新建对话
    if (newChatBtn) {
      newChatBtn.addEventListener('click', function () {
        clearHistory();
        if (skillsEl) skillsEl.style.display = '';
        if (chatInput) chatInput.focus();
      });
    }

    // 中止生成
    if (chatSend) {
      chatSend.addEventListener('click', function () {
        if (state.isStreaming) {
          // 停止生成
          if (state.abortController) {
            state.abortController.abort();
          }
        } else {
          // 发送消息
          var text = chatInput ? chatInput.value : '';
          if (text.trim()) {
            if (chatInput) chatInput.value = '';
            sendMessage(text);
          }
        }
      });
    }

    // 回车发送（Shift+Enter 换行）
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (state.isStreaming) return;
          var text = chatInput.value;
          if (text.trim()) {
            chatInput.value = '';
            var needSearch = /搜索|查一|查下|最新|竞品|对比|行业|趋势|市场/i.test(text);
            sendMessage(text, needSearch);
          }
        }
      });

      // 自动调整高度
      chatInput.addEventListener('input', function () {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      });
    }

    // 快捷技能按钮
    if (skillsEl) {
      skillsEl.querySelectorAll('.pm-skill-btn').forEach(function (skillBtn) {
        skillBtn.addEventListener('click', function () {
          var prompt = skillBtn.getAttribute('data-prompt') || '';
          if (prompt) {
            // 将快捷提示填入输入框让用户确认
            if (chatInput) {
              chatInput.value = prompt;
              chatInput.style.height = 'auto';
              chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
              chatInput.focus();
            }
          }
        });
      });
    }

    // 思考过程折叠切换
    if (thinkingToggle && thinkingEl) {
      thinkingToggle.addEventListener('click', function () {
        var isOpen = thinkingEl.classList.toggle('pm-thinking--open');
        thinkingToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // ESC 关闭面板
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        // 先停止生成中
        if (state.isStreaming && state.abortController) {
          state.abortController.abort();
        }
        closePanel();
      }
    });

    // 点击面板外关闭（可选，不影响面板内操作）
    // 不启用，因为面板是主要工作区，容易误触关闭

    // 初始化：加载历史
    loadHistory();

    // 移动端：软键盘处理
    if (typeof window.visualViewport !== 'undefined') {
      window.visualViewport.addEventListener('resize', function () {
        if (state.isOpen && chat) {
          var viewport = window.visualViewport;
          if (viewport.height < window.innerHeight * 0.8) {
            // 软键盘弹出
            chat.style.maxHeight = viewport.height - 20 + 'px';
          } else {
            chat.style.maxHeight = '';
          }
        }
      });
    }
  }

  function boot() {
    safe(initNavbar);
    safe(initNavScroll);
    safe(initMobileNav);
    safe(initCarousel);
    safe(initReveal);
    safe(initLightbox);
    safe(initWechatModal);
    safe(initCopyEmail);
    safe(initPmAgent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
