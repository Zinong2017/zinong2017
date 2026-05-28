(function () {
  'use strict';

  document.documentElement.classList.add('js-ready');

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
        link.classList.toggle('active', href === '#' + id);
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
      var isOpen = mobileNav.classList.toggle('open');
      hamburgerBtn.classList.toggle('open', isOpen);
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
        slides[i].classList.toggle('active', i === currentIndex);
      }
      for (var j = 0; j < dots.length; j++) {
        dots[j].classList.toggle('active', j === currentIndex);
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
    carousel.addEventListener('touchstart', stopAutoplay, { passive: true });
    carousel.addEventListener('touchend', function () {
      setTimeout(startAutoplay, 3000);
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

  function boot() {
    safe(initNavbar);
    safe(initNavScroll);
    safe(initMobileNav);
    safe(initCarousel);
    safe(initReveal);
    safe(initLightbox);
    safe(initWechatModal);
    safe(initCopyEmail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
