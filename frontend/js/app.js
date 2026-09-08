/* 风景光影 — shared app behaviour.
   Theme toggle, Lucide icons, scroll-aware nav, reveal-on-scroll,
   search overlay, modal & toast helpers. Safe to load on every page. */
(function () {
  'use strict';

  const LP = (window.LP = window.LP || {});

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  LP.escapeHtml = escapeHtml;

  /* ---------------- Theme ---------------- */
  const THEME_KEY = 'lp-theme';

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    html.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14121A' : '#FAF8F5');
  }

  function resolveInitialTheme() {
    const stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    setTheme(next);
  }

  // Apply before paint to avoid flash — call inline-ish (script is deferred,
  // but we run immediately on parse of this block).
  applyTheme(resolveInitialTheme());

  LP.toggleTheme = toggleTheme;
  LP.getTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  /* ---------------- Lucide icons ---------------- */
  LP.refreshIcons = function () {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  };

  /* ---------------- Toast ---------------- */
  LP.toast = function (message, opts) {
    opts = opts || {};
    let host = document.getElementById('lp-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'lp-toast-host';
      host.className = 'fixed top-20 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className =
      'pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lp-md bg-lp-surface text-lp-fg text-sm shadow-lp-float border border-lp-border max-w-xs';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<i data-lucide="' + (opts.icon || 'check-circle-2') + '" class="w-4 h-4 text-lp-primary"></i><span></span>';
    el.querySelector('span').textContent = message;
    host.appendChild(el);
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    LP.refreshIcons();
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 260);
    }, opts.duration || 2200);
  };

  /* ---------------- Modal helpers ---------------- */
  let lastFocused = null;

  LP.openModal = function (id) {
    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // focus first focusable
    const focusable = modal.querySelector(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) setTimeout(() => focusable.focus(), 50);
  };

  LP.closeModal = function (id) {
    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.lp-modal:not(.hidden)')) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  };

  LP.clipboard = async function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };

  /* ---------------- Like helpers (shared) ---------------- */
  LP.formatLikes = function (n) {
    n = Number(n) || 0;
    if (n >= 1000) {
      const v = n / 1000;
      return (v % 1 === 0 ? String(v) : v.toFixed(1)) + 'k';
    }
    return String(n);
  };

  LP.syncLikeButton = function (btn, liked, likes) {
    btn.setAttribute('data-liked', liked ? 'true' : 'false');
    if (typeof likes === 'number') btn.setAttribute('data-likes', String(likes));
    const label = btn.querySelector('[data-likes-label]');
    if (label)
      label.textContent = LP.formatLikes(likes != null ? likes : Number(btn.getAttribute('data-likes')));
    const svg = btn.querySelector('svg');
    if (svg) svg.classList.toggle('fill-current', liked);
  };

  LP.toggleLike = function (btn) {
    const liked = btn.getAttribute('data-liked') === 'true';
    let likes = Number(btn.getAttribute('data-likes')) || 0;
    likes = liked ? likes - 1 : likes + 1;
    LP.syncLikeButton(btn, !liked, likes);
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.classList.remove('lp-like-pop');
      void svg.offsetWidth;
      svg.classList.add('lp-like-pop');
    }
  };

  /* ---------------- Shared photo lightbox ---------------- */
  let photoList = [];
  let photoIndex = 0;

  function buildLightbox() {
    if (document.getElementById('photo-lightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'photo-lightbox';
    lb.className =
      'lp-modal hidden fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '图片查看器');
    lb.innerHTML =
      '<button data-modal-close class="absolute top-4 right-4 w-10 h-10 rounded-lp-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="关闭"><i data-lucide="x" class="w-5 h-5"></i></button>' +
      '<button data-photo-prev class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lp-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="上一张"><i data-lucide="chevron-left" class="w-6 h-6"></i></button>' +
      '<button data-photo-next class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lp-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="下一张"><i data-lucide="chevron-right" class="w-6 h-6"></i></button>' +
      '<div class="max-w-5xl w-full max-h-[88vh] flex flex-col items-center">' +
        '<img id="photo-lb-img" src="" alt="" class="max-h-[72vh] w-auto max-w-full rounded-lp-lg object-contain shadow-lp-overlay">' +
        '<div class="mt-4 w-full max-w-2xl text-center text-white">' +
          '<h3 id="photo-lb-title" class="lp-h3 text-lg"></h3>' +
          '<div class="flex items-center justify-center gap-4 mt-2 text-sm text-white/70">' +
            '<span id="photo-lb-location" class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i><span></span></span>' +
            '<span id="photo-lb-date" class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i><span></span></span>' +
            '<span id="photo-lb-camera" class="hidden sm:flex items-center gap-1"><i data-lucide="camera" class="w-3.5 h-3.5"></i><span></span></span>' +
          '</div>' +
          '<button id="photo-lb-like" class="lp-like-btn inline-flex items-center gap-1.5 mt-3 px-3 h-9 rounded-lp-full bg-white/10 hover:bg-white/20 transition-colors" data-liked="false" data-likes="0">' +
            '<i data-lucide="heart" class="w-4 h-4"></i><span class="text-sm lp-mono" data-likes-label>0</span>' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);
    LP.refreshIcons();

    lb.querySelector('[data-photo-prev]').addEventListener('click', (e) => {
      e.stopPropagation();
      photoStep(-1);
    });
    lb.querySelector('[data-photo-next]').addEventListener('click', (e) => {
      e.stopPropagation();
      photoStep(1);
    });
    lb.querySelector('#photo-lb-like').addEventListener('click', (e) => {
      e.stopPropagation();
      LP.toggleLike(e.currentTarget);
    });
    lb.querySelector('[data-modal-close]').addEventListener('click', (e) => {
      e.stopPropagation();
      LP.closePhoto();
    });
    lb.addEventListener('click', (e) => {
      if (e.target === lb) LP.closePhoto();
    });
  }

  function renderPhoto() {
    const w = photoList[photoIndex];
    if (!w) return;
    const lb = document.getElementById('photo-lightbox');
    lb.querySelector('#photo-lb-img').src = w.src;
    lb.querySelector('#photo-lb-img').alt = w.title;
    lb.querySelector('#photo-lb-title').textContent = w.title;
    lb.querySelector('#photo-lb-location span').textContent = w.location;
    lb.querySelector('#photo-lb-date span').textContent = w.date;
    lb.querySelector('#photo-lb-camera span').textContent = w.camera;
    LP.syncLikeButton(lb.querySelector('#photo-lb-like'), false, w.likes);
    LP.refreshIcons();
  }

  function photoStep(dir) {
    if (!photoList.length) return;
    photoIndex = (photoIndex + dir + photoList.length) % photoList.length;
    renderPhoto();
  }

  LP.openPhoto = function (list, index) {
    if (!list || !list.length) return;
    buildLightbox();
    photoList = list;
    photoIndex = Math.min(Math.max(index || 0, 0), list.length - 1);
    renderPhoto();
    LP.openModal(document.getElementById('photo-lightbox'));
  };

  LP.closePhoto = function () {
    LP.closeModal(document.getElementById('photo-lightbox'));
  };

  /* ---------------- Reveal-on-scroll (defined early, used by page scripts) ---------------- */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let revealIO = null;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealIO.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
  }
  function observeReveals(scope) {
    const root = scope || document;
    const items = root.querySelectorAll('.reveal:not(.is-visible)');
    if (reducedMotion || !revealIO) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    items.forEach((el, i) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', Math.min(i * 60, 240) + 'ms');
      }
      revealIO.observe(el);
    });
  }
  LP.refreshReveals = observeReveals;
  observeReveals();


  /* ---------------- DOM ready bootstrap ---------------- */
  function init() {
    // Icons
    LP.refreshIcons();

    // Theme toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });

    // System theme changes (only if user hasn't explicitly chosen)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });

    // Scroll-aware nav
    const nav = document.querySelector('[data-nav]');
    if (nav) {
      const onScroll = () => {
        if (window.scrollY > 8) nav.setAttribute('data-scrolled', 'true');
        else nav.removeAttribute('data-scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Reveal-on-scroll already bootstrapped at module top-level.

    // Generic modal wiring: [data-modal-open] / [data-modal-close]
    document.querySelectorAll('[data-modal-open]').forEach((btn) => {
      btn.addEventListener('click', () => LP.openModal(btn.getAttribute('data-modal-open')));
    });
    document.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.lp-modal');
        if (modal) LP.closeModal(modal);
      });
    });
    document.querySelectorAll('.lp-modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) LP.closeModal(modal);
      });
    });

    // Escape closes top-most open modal; arrows navigate the photo lightbox
    document.addEventListener('keydown', (e) => {
      const photoLb = document.getElementById('photo-lightbox');
      const photoOpen = photoLb && !photoLb.classList.contains('hidden');
      if (photoOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        photoStep(e.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (e.key === 'Escape') {
        const open = document.querySelector('.lp-modal:not(.hidden)');
        if (open) {
          LP.closeModal(open);
          return;
        }
        const search = document.getElementById('search-overlay');
        if (search && !search.classList.contains('hidden')) {
          LP.closeSearch();
        }
      }
    });

    // Search overlay (built lazily, shared across pages)
    buildSearchOverlay();

    // Search overlay
    const searchBtn = document.querySelector('[data-search-open]');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => LP.openSearch());
    }
    const searchClose = document.querySelector('[data-search-close]');
    if (searchClose) {
      searchClose.addEventListener('click', () => LP.closeSearch());
    }
  }

  /* ---------------- Search overlay (built once, shared) ---------------- */
  function buildSearchOverlay() {
    if (document.getElementById('search-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'hidden fixed inset-0 z-[95] bg-lp-bg/80 backdrop-blur-md';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="max-w-2xl mx-auto mt-16 sm:mt-24 px-4">' +
        '<div class="flex items-center gap-3 px-4 h-14 rounded-lp-full bg-lp-surface shadow-lp-float border border-lp-border">' +
          '<i data-lucide="search" class="w-5 h-5 text-lp-fg-muted shrink-0"></i>' +
          '<input type="search" placeholder="搜索作品、地点、分类…" aria-label="搜索" class="flex-1 min-w-0 bg-transparent text-lp-fg placeholder:text-lp-fg-subtle outline-none text-base">' +
          '<button data-search-close class="shrink-0 px-2.5 h-8 rounded-lp-full text-lp-fg-muted hover:bg-lp-surface-2 text-xs lp-mono">Esc</button>' +
        '</div>' +
        '<div data-search-results class="mt-4"></div>' +
        '<p data-search-hint class="mt-3 text-center text-xs text-lp-fg-subtle">输入关键词，按作品名、地点或分类搜索</p>' +
      '</div>';
    document.body.appendChild(overlay);
    LP.refreshIcons();

    const input = overlay.querySelector('input[type="search"]');
    const results = overlay.querySelector('[data-search-results]');
    const hint = overlay.querySelector('[data-search-hint]');

    input.addEventListener('input', () => {
      const q = input.value;
      LP.runSearch(q, (list) => renderResults(list, q));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) LP.closeSearch();
    });

    function renderResults(list, q) {
      if (!q.trim()) {
        results.innerHTML = '';
        hint.textContent = '输入关键词，按作品名、地点或分类搜索';
        hint.classList.remove('hidden');
        return;
      }
      hint.classList.add('hidden');
      if (!list.length) {
        results.innerHTML =
          '<div class="text-center py-10 text-lp-fg-muted text-sm">没有找到「' + escapeHtml(q) + '」相关作品</div>';
        return;
      }
      // 缓存当前搜索结果，供点击时打开灯箱
      overlay._lpSearchResults = list;
      results.innerHTML =
        '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
          list
            .map(function (w) {
              return (
                '<button data-result-id="' + w.id + '" class="group relative rounded-lp-lg overflow-hidden block bg-lp-surface-2 shadow-lp-sm text-left">' +
                  '<img src="' + w.src + '" alt="' + escapeHtml(w.title) + '" class="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'">' +
                  '<div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">' +
                    '<div class="text-white text-sm font-medium truncate">' + escapeHtml(w.title) + '</div>' +
                    '<div class="text-white/70 text-xs truncate">' + escapeHtml(w.location) + '</div>' +
                  '</div>' +
                '</button>'
              );
            })
            .join('') +
        '</div>';
      results.querySelectorAll('[data-result-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-result-id');
          var cached = overlay._lpSearchResults || [];
          var idx = cached.findIndex(function (w) { return String(w.id) === String(id); });
          if (idx !== -1) {
            // 关闭搜索浮层再打开灯箱
            LP.closeSearch();
            var lbList = cached.map(function (w) {
              return { id: w.id, src: w.src, title: w.title, location: w.location, date: w.date || '', camera: w.camera || '', likes: w.likes || 0 };
            });
            LP.openPhoto(lbList, idx);
          }
        });
      });
      LP.refreshIcons();
    }
  }

  LP.openSearch = function () {
    let overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const input = overlay.querySelector('input[type="search"]');
    if (input) {
      setTimeout(() => input.focus(), 60);
      input.select && input.select();
    }
  };

  LP.closeSearch = function () {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.lp-modal:not(.hidden)')) {
      document.body.classList.remove('modal-open');
    }
  };

  // 搜索：优先走后端 /search?q=，失败时降级到本地 LP_DATA 匹配
  LP.runSearch = async function (query, renderFn) {
    if (typeof renderFn !== 'function') return;
    const q = (query || '').trim();
    if (window.LP.api && q) {
      try {
        const result = await LP.api.search({ q: q });
        const items = (result && result.items) || [];
        renderFn(
          items.map(function (p) {
            var n = LP.normalizePhoto ? LP.normalizePhoto(p) : null;
            return {
              id: String(p.public_id || p.id),
              title: p.title || '',
              location: p.place_name || '',
              category: (p.tags && p.tags[0]) || '',
              src: (n && (n.src || n.thumb)) || p.url_thumb || p.url_medium || '',
              date: n ? n.date : '',
              camera: n ? n.camera : '',
              likes: n ? n.likes : 0,
            };
          })
        );
        return;
      } catch (_) { /* 降级到本地 */ }
    }
    // 本地回退
    const local = window.LP_DATA && window.LP_DATA.works ? window.LP_DATA.works : [];
    const ql = q.toLowerCase();
    const results = ql
      ? local.filter(
          (w) =>
            (w.title || '').toLowerCase().includes(ql) ||
            (w.location || '').toLowerCase().includes(ql) ||
            (w.category || '').toLowerCase().includes(ql)
        )
      : local;
    renderFn(results);
  };

  /* ---------------- Auth: 登录/注册弹窗 ---------------- */
  function buildAuthModal() {
    if (document.getElementById('auth-modal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="auth-modal" class="lp-modal hidden fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="账号">' +
        '<div class="w-full max-w-sm rounded-lp-xl bg-lp-surface shadow-lp-overlay border border-lp-border overflow-hidden">' +
          '<div class="relative px-6 pt-6 pb-2 flex items-start justify-between">' +
            '<div>' +
              '<h2 id="auth-title" class="lp-h2 text-xl text-lp-fg">登录</h2>' +
              '<p id="auth-subtitle" class="text-sm text-lp-fg-muted mt-1">欢迎回到风景光影</p>' +
            '</div>' +
            '<button data-modal-close class="w-8 h-8 rounded-lp-full flex items-center justify-center text-lp-fg-muted hover:bg-lp-surface-2 transition-colors" aria-label="关闭"><i data-lucide="x" class="w-4 h-4"></i></button>' +
          '</div>' +
          '<div class="px-6 pb-6 pt-3 space-y-4">' +
            '<div class="flex rounded-lp-md p-1 bg-lp-surface-2 text-sm">' +
              '<button data-auth-tab="login" class="flex-1 h-9 rounded-lp-md transition-colors font-medium text-lp-fg bg-lp-surface shadow-lp-sm">登录</button>' +
              '<button data-auth-tab="register" class="flex-1 h-9 rounded-lp-md transition-colors font-medium text-lp-fg-muted hover:text-lp-fg">注册</button>' +
            '</div>' +
            '<form id="auth-login" class="space-y-3">' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="login-email">邮箱</label>' +
                '<input id="login-email" name="email" type="email" autocomplete="email" required class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="you@example.com">' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="login-password">密码</label>' +
                '<input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="至少 8 位，含字母与数字">' +
              '</div>' +
              '<button id="login-submit" type="submit" class="w-full h-10 rounded-lp-md bg-lp-primary text-white text-sm font-medium hover:bg-lp-primary-hover disabled:opacity-60 transition-colors">登录</button>' +
            '</form>' +
            '<form id="auth-register" class="space-y-3 hidden">' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="reg-nickname">昵称</label>' +
                '<input id="reg-nickname" name="nickname" type="text" required minlength="1" maxlength="64" class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="展示给别人的名字">' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="reg-email">邮箱</label>' +
                '<input id="reg-email" name="email" type="email" autocomplete="email" required class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="you@example.com">' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="reg-password">密码</label>' +
                '<input id="reg-password" name="password" type="password" autocomplete="new-password" required minlength="8" class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="至少 8 位，含字母与数字">' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-medium text-lp-fg mb-1.5" for="reg-bio">一句话介绍</label>' +
                '<input id="reg-bio" name="bio" type="text" maxlength="500" class="w-full h-10 px-3 rounded-lp-md bg-lp-bg border border-lp-input text-lp-fg text-sm focus:border-lp-ring outline-none transition-colors" placeholder="可以先空着，稍后去主页改">' +
              '</div>' +
              '<button id="reg-submit" type="submit" class="w-full h-10 rounded-lp-md bg-lp-primary text-white text-sm font-medium hover:bg-lp-primary-hover disabled:opacity-60 transition-colors">创建账号</button>' +
            '</form>' +
            '<p class="text-center text-xs text-lp-fg-subtle pt-1">登录或注册即代表您同意《用户协议》与《隐私政策》</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstElementChild);
    LP.refreshIcons();

    const modal = document.getElementById('auth-modal');
    // auth-modal 是动态注入的，init() 早期绑定的 data-modal-close 扫不到它，
    // 这里单独给关闭按钮 + 垫层点击绑定事件，确保可以关闭。
    modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => LP.closeModal(modal));
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) LP.closeModal(modal);
    });
    const tabs = modal.querySelectorAll('[data-auth-tab]');
    const loginForm = modal.querySelector('#auth-login');
    const registerForm = modal.querySelector('#auth-register');
    const title = modal.querySelector('#auth-title');
    const subtitle = modal.querySelector('#auth-subtitle');
    function switchTab(which) {
      tabs.forEach((b) => {
        const on = b.getAttribute('data-auth-tab') === which;
        b.classList.toggle('bg-lp-surface', on);
        b.classList.toggle('shadow-lp-sm', on);
        b.classList.toggle('text-lp-fg', on);
        b.classList.toggle('text-lp-fg-muted', !on);
      });
      if (which === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        title.textContent = '登录';
        subtitle.textContent = '欢迎回到风景光影';
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        title.textContent = '创建账号';
        subtitle.textContent = '加入我们，分享你的第一张风景';
      }
    }
    tabs.forEach((b) => b.addEventListener('click', () => switchTab(b.getAttribute('data-auth-tab'))));
    LP.openAuth = function (which) {
      buildAuthModal();
      switchTab(which === 'register' ? 'register' : 'login');
      LP.openModal('auth-modal');
      setTimeout(() => {
        const focus = which === 'register' ? document.getElementById('reg-nickname') : document.getElementById('login-email');
        if (focus) focus.focus();
      }, 60);
    };
    LP.onAuthRequired = function () { LP.openAuth('login'); };

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.LP.api) { LP.toast('API 未就绪', { icon: 'alert-circle' }); return; }
      const email = loginForm.querySelector('#login-email').value.trim();
      const password = loginForm.querySelector('#login-password').value;
      const btn = loginForm.querySelector('#login-submit');
      btn.disabled = true;
      try {
        await LP.api.login({ email, password });
        LP.toast('登录成功', { icon: 'check-circle-2' });
        LP.closeModal('auth-modal');
        LP.renderNav && LP.renderNav(document.body.getAttribute('data-page') || '');
        if (typeof LP.onLoggedIn === 'function') { try { LP.onLoggedIn(); } catch (_) {} }
        else setTimeout(() => window.location.reload(), 400);
      } catch (err) {
        LP.toast(err.message || '登录失败', { icon: 'alert-circle' });
      } finally { btn.disabled = false; }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.LP.api) { LP.toast('API 未就绪', { icon: 'alert-circle' }); return; }
      const payload = {
        nickname: registerForm.querySelector('#reg-nickname').value.trim(),
        email: registerForm.querySelector('#reg-email').value.trim(),
        password: registerForm.querySelector('#reg-password').value,
        bio: registerForm.querySelector('#reg-bio').value.trim() || '',
      };
      if (!/[A-Za-z]/.test(payload.password) || !/\d/.test(payload.password)) {
        LP.toast('密码需包含字母和数字', { icon: 'alert-circle' }); return;
      }
      const btn = registerForm.querySelector('#reg-submit');
      btn.disabled = true;
      try {
        await LP.api.register(payload);
        LP.toast('注册成功，欢迎加入', { icon: 'check-circle-2' });
        LP.closeModal('auth-modal');
        LP.renderNav && LP.renderNav(document.body.getAttribute('data-page') || '');
        setTimeout(() => window.location.reload(), 400);
      } catch (err) {
        const msg = (err && err.data && err.data.detail) ? err.data.detail : (err.message || '注册失败');
        LP.toast(typeof msg === 'string' ? msg : '注册失败，请检查输入', { icon: 'alert-circle' });
      } finally { btn.disabled = false; }
    });
  }

  /* ---------------- DOM ready bootstrap ---------------- */
  function init() {
    // Icons
    LP.refreshIcons();

    // Theme toggle buttons
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });

    // System theme changes (only if user hasn't explicitly chosen)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
    });

    // Scroll-aware nav
    const nav = document.querySelector('[data-nav]');
    if (nav) {
      const onScroll = () => {
        if (window.scrollY > 8) nav.setAttribute('data-scrolled', 'true');
        else nav.removeAttribute('data-scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Reveal-on-scroll already bootstrapped at module top-level.

    // Generic modal wiring: [data-modal-open] / [data-modal-close]
    document.querySelectorAll('[data-modal-open]').forEach((btn) => {
      btn.addEventListener('click', () => LP.openModal(btn.getAttribute('data-modal-open')));
    });
    document.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.lp-modal');
        if (modal) LP.closeModal(modal);
      });
    });
    document.querySelectorAll('.lp-modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) LP.closeModal(modal);
      });
    });

    // Escape closes top-most open modal; arrows navigate the photo lightbox
    document.addEventListener('keydown', (e) => {
      const photoLb = document.getElementById('photo-lightbox');
      const photoOpen = photoLb && !photoLb.classList.contains('hidden');
      if (photoOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        photoStep(e.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (e.key === 'Escape') {
        const open = document.querySelector('.lp-modal:not(.hidden)');
        if (open) {
          LP.closeModal(open);
          return;
        }
        const search = document.getElementById('search-overlay');
        if (search && !search.classList.contains('hidden')) {
          LP.closeSearch();
        }
      }
    });

    // Search overlay (built lazily, shared across pages)
    buildSearchOverlay();

    // Search overlay buttons
    const searchBtn = document.querySelector('[data-search-open]');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => LP.openSearch());
    }
    const searchClose = document.querySelector('[data-search-close]');
    if (searchClose) {
      searchClose.addEventListener('click', () => LP.closeSearch());
    }

    // 登录/注册弹窗（有 api.js 时才构建）
    if (window.LP.api) buildAuthModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
