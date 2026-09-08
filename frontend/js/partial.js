/* 风景光影 — shared layout partials (nav / footer / mobile tab bar).
 * 新增：根据 LP.auth.isLoggedIn() 动态渲染登录/注册按钮 or 用户头像+下拉（我的主页/退出）。
 * 暴露 LP.renderNav(page?) 供登录/登出后局部刷新导航栏。 */
(function () {
  'use strict';

  const LP = (window.LP = window.LP || {});
  const esc = LP.escapeHtml || ((s) => String(s == null ? '' : s));

  /* ---------- 导航链接 ---------- */
  function navLink(href, label, page, current, extraClass) {
    const active = page === current;
    const cls =
      'px-4 py-2 rounded-lp-md text-sm font-medium transition-colors whitespace-nowrap ' +
      (active ? 'text-lp-fg bg-lp-surface-2' : 'text-lp-fg-muted hover:text-lp-fg hover:bg-lp-surface-2');
    return (
      '<a href="' + href + '" data-nav-link class="' + cls + (extraClass ? ' ' + extraClass : '') + '">' + label + '</a>'
    );
  }

  function authNav() {
    const loggedIn = !!(LP.auth && LP.auth.isLoggedIn && LP.auth.isLoggedIn());
    const me = (LP.auth && typeof LP.auth.getCachedMe === 'function') ? LP.auth.getCachedMe() : null;
    const avatarUrl = (me && me.avatar_url) || 'assets/image_0_r53wpn.jpg';
    const nickname = (me && me.nickname) || '我的主页';
    if (!loggedIn) {
      return (
        '<div class="flex items-center gap-1.5 shrink-0">' +
          '<button data-auth-open="login" class="px-3 h-9 rounded-lp-md border border-lp-border-strong bg-lp-surface text-sm font-medium text-lp-fg hover:bg-lp-surface-2 transition-colors">登录</button>' +
          '<button data-auth-open="register" class="px-3 sm:px-4 h-9 rounded-lp-md bg-lp-primary text-white text-sm font-medium hover:bg-lp-primary-hover transition-colors">注册</button>' +
        '</div>'
      );
    }
    return (
      '<div class="flex items-center gap-1.5 sm:gap-2 shrink-0">' +
        '<button data-theme-toggle class="relative w-9 h-9 rounded-lp-full flex items-center justify-center text-lp-fg-muted hover:bg-lp-surface-2 hover:text-lp-fg transition-colors" aria-label="切换深浅主题">' +
          '<i data-lucide="sun" class="theme-icon-sun w-[18px] h-[18px]"></i>' +
          '<i data-lucide="moon" class="theme-icon-moon w-[18px] h-[18px]"></i>' +
        '</button>' +
        '<button data-search-open class="w-9 h-9 rounded-lp-full flex items-center justify-center text-lp-fg-muted hover:bg-lp-surface-2 hover:text-lp-fg transition-colors" aria-label="搜索">' +
          '<i data-lucide="search" class="w-[18px] h-[18px]"></i>' +
        '</button>' +
        '<a href="upload.html" class="flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-lp-md bg-lp-primary text-white text-sm font-medium hover:bg-lp-primary-hover transition-colors">' +
          '<i data-lucide="upload" class="w-4 h-4"></i><span class="hidden sm:inline">上传</span>' +
        '</a>' +
        // 头像按钮：点击出现下拉
        '<div class="relative" data-user-menu>' +
          '<button data-user-menu-btn class="w-9 h-9 rounded-lp-full overflow-hidden border-2 border-lp-primary block shrink-0 focus:outline-none focus:ring-2 focus:ring-lp-ring" aria-label="' + esc(nickname) + '">' +
            '<img src="' + esc(avatarUrl) + '" class="w-full h-full object-cover" alt="头像" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'">' +
          '</button>' +
          '<div class="hidden absolute right-0 mt-2 w-44 rounded-lp-lg bg-lp-surface border border-lp-border shadow-lp-overlay z-[60]" data-user-menu-panel role="menu">' +
            '<div class="px-4 py-3 border-b border-lp-border">' +
              '<div class="text-sm font-medium text-lp-fg truncate">' + esc(nickname) + '</div>' +
              '<div class="text-xs text-lp-fg-subtle truncate">' + ((me && me.email) ? esc(me.email) : '') + '</div>' +
            '</div>' +
            '<a href="profile.html" class="flex items-center gap-2 px-4 h-10 text-sm text-lp-fg hover:bg-lp-surface-2 transition-colors"><i data-lucide="user" class="w-4 h-4 text-lp-fg-muted"></i>我的主页</a>' +
            '<a href="upload.html" class="flex items-center gap-2 px-4 h-10 text-sm text-lp-fg hover:bg-lp-surface-2 transition-colors"><i data-lucide="image-plus" class="w-4 h-4 text-lp-fg-muted"></i>上传作品</a>' +
            '<button data-logout-btn type="button" class="w-full flex items-center gap-2 px-4 h-10 text-sm text-lp-error hover:bg-lp-surface-2 transition-colors border-t border-lp-border text-left"><i data-lucide="log-out" class="w-4 h-4"></i>退出登录</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function navHTML(page) {
    return (
      '<nav data-nav class="fixed top-0 inset-x-0 z-50 bg-lp-surface/85 backdrop-blur-lg border-b border-lp-border transition-shadow duration-300">' +
        '<div class="max-w-lp-container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">' +
          '<a href="index.html" class="flex items-center gap-2.5 shrink-0">' +
            '<div class="w-9 h-9 rounded-lp-md bg-lp-primary flex items-center justify-center shadow-lp-sm"><i data-lucide="mountain-snow" class="w-5 h-5 text-white"></i></div>' +
            '<span class="lp-h3 text-lp-fg">风景光影</span>' +
          '</a>' +
          '<div class="hidden md:flex items-center gap-1">' +
            navLink('index.html', '发现', 'discover', page) +
            navLink('map-exploration.html', '地图探索', 'map', page) +
            navLink('timeline.html', '时间轴', 'timeline', page) +
          '</div>' +
          // 右侧 auth 区（内部已经包含主题/搜索/上传/头像）
          authNav() +
        '</div>' +
      '</nav>'
    );
  }

  function tabbarHTML(page) {
    const item = (href, icon, label, key) => {
      const active = page === key;
      const c = active ? 'text-lp-primary' : 'text-lp-fg-subtle';
      return (
        '<a href="' + href + '" class="flex flex-col items-center gap-0.5 ' + c + '">' +
          '<i data-lucide="' + icon + '" class="w-5 h-5"></i><span class="text-[10px]">' + label + '</span>' +
        '</a>'
      );
    };
    return (
      '<nav class="fixed bottom-0 inset-x-0 z-50 bg-lp-surface/95 backdrop-blur-lg border-t border-lp-border md:hidden">' +
        '<div class="flex items-center justify-around h-16">' +
          item('index.html', 'compass', '发现', 'discover') +
          item('map-exploration.html', 'map', '地图', 'map') +
          item('upload.html', 'plus-circle', '上传', 'upload') +
          item('profile.html', 'user', '我的', 'profile') +
        '</div>' +
      '</nav>'
    );
  }

  function footerHTML() {
    return (
      '<footer class="border-t border-lp-border mt-8 hidden md:block">' +
        '<div class="max-w-lp-container mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">' +
          '<p class="lp-caption text-sm text-lp-fg-subtle">© 2026 风景光影 — 用镜头记录世界的呼吸</p>' +
          '<div class="flex items-center gap-4 text-lp-fg-subtle">' +
            '<a href="index.html" class="hover:text-lp-fg transition-colors text-sm">发现</a>' +
            '<a href="timeline.html" class="hover:text-lp-fg transition-colors text-sm">时间轴</a>' +
            '<a href="upload.html" class="hover:text-lp-fg transition-colors text-sm">上传</a>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function wireAuthButtons(root) {
    if (!root) root = document;
    // 打开登录/注册弹窗
    root.querySelectorAll('[data-auth-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-auth-open');
        if (typeof LP.openAuth === 'function') LP.openAuth(which);
      });
    });
    // 用户菜单切换
    const menuBtn = root.querySelector('[data-user-menu-btn]');
    const menuPanel = root.querySelector('[data-user-menu-panel]');
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuPanel.classList.toggle('hidden');
      });
      // 点击外部关闭
      document.addEventListener('click', (e) => {
        if (!root.querySelector('[data-user-menu]')) return;
        const host = root.querySelector('[data-user-menu]');
        if (!host.contains(e.target)) menuPanel.classList.add('hidden');
      });
    }
    // 登出按钮
    const logoutBtn = root.querySelector('[data-logout-btn]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (LP.api && typeof LP.api.logout === 'function') LP.api.logout();
        if (typeof LP.toast === 'function') LP.toast('已退出登录');
        // 重新渲染导航 + 回到首页
        LP.renderNav && LP.renderNav(document.body.getAttribute('data-page') || '');
        setTimeout(() => { window.location.href = 'index.html'; }, 300);
      });
    }
  }

  function inject(page) {
    page = page || document.body.getAttribute('data-page') || '';
    const navHost = document.querySelector('[data-include="nav"]');
    if (navHost) {
      navHost.outerHTML = navHTML(page);
    }
    const footerHost = document.querySelector('[data-include="footer"]');
    if (footerHost) footerHost.outerHTML = footerHTML();
    const tabbarHost = document.querySelector('[data-include="tabbar"]');
    if (tabbarHost) tabbarHost.outerHTML = tabbarHTML(page);

    wireAuthButtons(document);
    // 主题/搜索按钮如果存在于新渲染的 nav，等待 app.js init 来接线（它会扫整个 DOM）
  }

  LP.renderNav = function (page) { inject(page); if (LP.refreshIcons) LP.refreshIcons(); };

  // Run immediately (script is at end of body, DOM above is parsed).
  inject();
})();
