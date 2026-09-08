/* 风景光影 — profile section (lives on profile.html).
 * Fetches /users/me (or the user in ?uid=) + 作品/收藏/合集 tabs from real API.
 * If no profile root in this page, file quietly no-ops. */
(function () {
  'use strict';

  const LP = window.LP;
  if (!LP) return;
  const esc = LP.escapeHtml;

  const root = document.getElementById('profile-root');
  if (!root) return;

  const tabHost = document.getElementById('profile-tabs');
  const avatar = document.getElementById('profile-avatar');
  const nameEl = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  const taglineEl = document.getElementById('profile-tagline');
  const locationEl = document.getElementById('profile-location');
  const websiteEl = document.getElementById('profile-website');
  const statWorks = document.getElementById('stat-works');
  const statLikes = document.getElementById('stat-likes');
  const statCollections = document.getElementById('stat-collections');
  const statFollowing = document.getElementById('stat-following');
  const gallery = document.getElementById('profile-gallery');
  const empty = document.getElementById('profile-empty');
  const emptyHint = document.getElementById('profile-empty-hint');

  let activeTab = 'works';

  function tabActive(name) {
    return name === activeTab
      ? 'bg-lp-surface-2 border-lp-border text-lp-fg shadow-lp-xs'
      : 'bg-transparent border-transparent text-lp-fg-muted hover:text-lp-fg';
  }

  function renderTabs() {
    if (!tabHost) return;
    const tabs = [
      { v: 'works', label: '作品', icon: 'image' },
      { v: 'likes', label: '收藏', icon: 'heart' },
      { v: 'collections', label: '合集', icon: 'bookmark' },
    ];
    tabHost.innerHTML = tabs
      .map((t) => {
        return (
          '<button data-profile-tab="' + t.v + '" class="' + tabActive(t.v) + ' inline-flex items-center gap-2 px-4 h-9 rounded-lp-md text-sm font-medium border transition-colors">' +
          '<i data-lucide="' + t.icon + '" class="w-4 h-4"></i>' + t.label + '</button>'
        );
      })
      .join('');
    LP.refreshIcons();
    tabHost.querySelectorAll('[data-profile-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-profile-tab');
        renderTabs();
        renderCurrentContent();
      });
    });
  }

  function renderProfileHeader(u) {
    if (avatar) {
      const src = (u.avatar_url || u.avatar || '') || 'assets/image_0_r53wpn.jpg';
      avatar.src = src;
      avatar.onerror = function () { this.onerror = null; this.src = 'assets/image_0_r53wpn.jpg'; };
    }
    if (nameEl) nameEl.textContent = u.nickname || u.name || '未命名';
    if (handleEl) handleEl.textContent = u.username ? ('@' + u.username) : '';
    if (taglineEl) taglineEl.textContent = u.tagline || u.bio || '这个人暂时还没有填写简介。';
    if (locationEl) locationEl.innerHTML = u.location ? '<i data-lucide="map-pin" class="w-3.5 h-3.5"></i>' + esc(u.location) : '';
    if (websiteEl && u.website) {
      websiteEl.innerHTML = '<i data-lucide="link" class="w-3.5 h-3.5"></i><a href="' + esc(u.website) + '" target="_blank" rel="noopener noreferrer" class="underline">' + esc(u.website) + '</a>';
    } else if (websiteEl) {
      websiteEl.innerHTML = '';
    }
    const s = (u.stats && typeof u.stats === 'object') ? u.stats : {};
    if (statWorks) statWorks.textContent = s.works != null ? String(s.works) : '—';
    if (statLikes) statLikes.textContent = LP.formatLikes(s.likes != null ? s.likes : 0);
    if (statCollections) statCollections.textContent = s.collections != null ? String(s.collections) : '0';
    if (statFollowing) statFollowing.textContent = s.following != null ? String(s.following) : '0';
  }

  function renderGalleryOrEmpty(items, emptyText) {
    if (!items || !items.length) {
      if (gallery) gallery.innerHTML = '';
      if (empty) {
        empty.classList.remove('hidden');
        if (emptyHint) emptyHint.textContent = emptyText || '还没有内容。';
      }
      return;
    }
    if (empty) empty.classList.add('hidden');
    LP.renderGallery(gallery, items);
  }

  let currentUser = null;

  async function renderCurrentContent() {
    if (!currentUser) return;
    if (activeTab === 'works') {
      try {
        const r = await LP.api.getUserPhotos('' + currentUser.id, { page: 1, size: 40 });
        renderGalleryOrEmpty(r.items || [], 'TA 还没有上传作品。');
      } catch (_) { renderGalleryOrEmpty([], 'TA 还没有上传作品。'); }
    } else if (activeTab === 'likes') {
      try {
        const r = await LP.api.getMyFavorites({ page: 1, size: 40 });
        renderGalleryOrEmpty(r.items || [], '还没有收藏任何作品。');
      } catch (_) { renderGalleryOrEmpty([], '还没有收藏任何作品。'); }
    } else if (activeTab === 'collections') {
      try {
        const r = await LP.api.listCollections({ page: 1, size: 40 });
        const items = r.items || [];
        if (!items.length) {
          if (gallery) gallery.innerHTML = '';
          if (empty) {
            empty.classList.remove('hidden');
            if (emptyHint) emptyHint.textContent = '还没有创建合集。';
          }
          return;
        }
        if (empty) empty.classList.add('hidden');
        gallery.innerHTML = items
          .map((c) => {
            const cover = (c.cover_photo && (c.cover_photo.url_thumb || c.cover_photo.url_medium || c.cover_photo.src)) || 'assets/image_0_r53wpn.jpg';
            return (
              '<div class="relative rounded-lp-lg overflow-hidden border border-lp-border bg-lp-surface shadow-lp-sm">' +
                '<div class="aspect-[4/3]"><img src="' + esc(cover) + '" alt="' + esc(c.title || '') + '" class="w-full h-full object-cover" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'"></div>' +
                '<div class="p-3 sm:p-4">' +
                  '<h3 class="font-medium text-lp-fg line-clamp-1">' + esc(c.title || '未命名合集') + '</h3>' +
                  '<p class="text-xs text-lp-fg-subtle mt-1">' + (c.item_count || 0) + ' 张作品' + (c.visibility ? ' · ' + c.visibility : '') + '</p>' +
                '</div>' +
              '</div>'
            );
          })
          .join('');
        LP.refreshIcons();
      } catch (_) {
        if (empty) {
          empty.classList.remove('hidden');
          if (emptyHint) emptyHint.textContent = '加载合集失败。';
        }
      }
    }
  }

  async function loadProfile() {
    root.innerHTML = '<div class="py-20 text-center text-sm text-lp-fg-muted"><i data-lucide="loader-2" class="w-5 h-5 mx-auto animate-spin mb-2"></i>加载个人主页中…</div>';
    LP.refreshIcons();

    // uid query param → 他人主页；无 uid → /users/me
    let user = null;
    let targetId = null;
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    try {
      if (uid) {
        targetId = uid;
        user = await LP.api.getUser(uid);
      } else {
        user = await LP.api.me();
        targetId = user ? String(user.id) : null;
      }
    } catch (err) {
      if (err && err.status === 401) {
        if (typeof LP.onAuthRequired === 'function') LP.onAuthRequired();
      } else {
        // 未登录且无 user，回退本地占位
        if (window.LP_DATA) {
          const p = window.LP_DATA.profile;
          user = { nickname: p.name, avatar_url: p.avatar, tagline: p.tagline, bio: p.bio, location: p.location, website: p.website, stats: p.stats };
        }
      }
    }
    if (!user) {
      root.innerHTML = '<div class="py-20 text-center text-sm text-lp-fg-muted">无法加载个人主页，请稍后重试。</div>';
      return;
    }
    currentUser = user;
    root.innerHTML =
      '<div class="relative overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6 sm:mb-8">' +
        '<div class="h-36 sm:h-56 bg-gradient-to-r from-lp-primary/10 via-lp-accent/10 to-lp-primary/10 flex items-end p-4 sm:p-6">' +
          '<div class="lp-container max-w-lp flex items-end gap-4 sm:gap-5">' +
            '<img id="profile-avatar" alt="avatar" class="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-lp-bg shadow-lp-md bg-lp-surface-2">' +
            '<div class="pb-1 min-w-0">' +
              '<div class="flex items-center gap-2 flex-wrap"><h1 id="profile-name" class="lp-display text-lp-fg"></h1><span id="profile-handle" class="text-sm lp-mono text-lp-fg-subtle"></span></div>' +
              '<p id="profile-tagline" class="mt-1 text-sm sm:text-base text-lp-fg-muted line-clamp-1 sm:line-clamp-2"></p>' +
              '<div class="mt-2 flex items-center gap-3 text-xs text-lp-fg-subtle flex-wrap"><span id="profile-location" class="inline-flex items-center gap-1"></span><span id="profile-website" class="inline-flex items-center gap-1"></span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">' +
        '<div id="profile-tabs" role="tablist" class="flex items-center gap-2 flex-wrap"></div>' +
        '<div class="grid grid-cols-4 gap-2 sm:gap-4 text-center">' +
          '<div><div id="stat-works" class="lp-mono text-xl sm:text-2xl font-semibold text-lp-fg">0</div><div class="text-xs text-lp-fg-subtle mt-0.5">作品</div></div>' +
          '<div><div id="stat-likes" class="lp-mono text-xl sm:text-2xl font-semibold text-lp-fg">0</div><div class="text-xs text-lp-fg-subtle mt-0.5">获赞</div></div>' +
          '<div><div id="stat-collections" class="lp-mono text-xl sm:text-2xl font-semibold text-lp-fg">0</div><div class="text-xs text-lp-fg-subtle mt-0.5">合集</div></div>' +
          '<div><div id="stat-following" class="lp-mono text-xl sm:text-2xl font-semibold text-lp-fg">0</div><div class="text-xs text-lp-fg-subtle mt-0.5">关注</div></div>' +
        '</div>' +
      '</div>' +
      '<div id="profile-gallery" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"></div>' +
      '<div id="profile-empty" class="hidden text-center py-16 border border-dashed border-lp-border rounded-lp-lg bg-lp-surface/50"><i data-lucide="image" class="w-8 h-8 mx-auto text-lp-fg-muted/70 mb-3"></i><p class="text-sm text-lp-fg-muted" id="profile-empty-hint"></p></div>';
    // 重新抓取（因为 innerHTML 换了）
    const av2 = root.querySelector('#profile-avatar');
    const n2 = root.querySelector('#profile-name');
    const h2 = root.querySelector('#profile-handle');
    const t2 = root.querySelector('#profile-tagline');
    const l2 = root.querySelector('#profile-location');
    const w2 = root.querySelector('#profile-website');
    const sw2 = root.querySelector('#stat-works');
    const sl2 = root.querySelector('#stat-likes');
    const sc2 = root.querySelector('#stat-collections');
    const sf2 = root.querySelector('#stat-following');
    const th2 = root.querySelector('#profile-tabs');
    const g2 = root.querySelector('#profile-gallery');
    const e2 = root.querySelector('#profile-empty');
    const eh2 = root.querySelector('#profile-empty-hint');
    Object.assign(avatar || {}, { src: '' });
    // 把先前绑到全局的 ref 替换成当前 DOM
    const proxySet = (el, v) => { if (el) Object.assign(el, typeof v === 'function' ? {} : v); };
    // 注意：avatar/nameEl 等外面用了变量，这里把新查到的元素赋给相同命名的"真实"元素
    // 最稳的做法：再用 renderProfileHeader 一次，传入真实 DOM — 但 renderProfileHeader 用的是顶部的变量
    // 所以把顶部变量重绑：
    if (av2) { const p = av2; Object.defineProperty(avatar || {}, 'src', { set(v) { p.src = v; }, get() { return p.src; }, configurable: true }); }
    // 简单方案：直接手写赋值，不走 renderProfileHeader 变量
    if (av2) { const src = (user.avatar_url || user.avatar || '') || 'assets/image_0_r53wpn.jpg'; av2.src = src; av2.onerror = function () { this.onerror = null; this.src = 'assets/image_0_r53wpn.jpg'; }; }
    if (n2) n2.textContent = user.nickname || user.name || '未命名';
    if (h2) h2.textContent = user.username ? ('@' + user.username) : '';
    if (t2) t2.textContent = user.tagline || user.bio || '这个人暂时还没有填写简介。';
    if (l2) l2.innerHTML = user.location ? '<i data-lucide="map-pin" class="w-3.5 h-3.5"></i>' + esc(user.location) : '';
    if (w2 && user.website) w2.innerHTML = '<i data-lucide="link" class="w-3.5 h-3.5"></i><a href="' + esc(user.website) + '" target="_blank" rel="noopener noreferrer" class="underline">' + esc(user.website) + '</a>';
    else if (w2) w2.innerHTML = '';
    const s = (user.stats && typeof user.stats === 'object') ? user.stats : {};
    if (sw2) sw2.textContent = s.works != null ? String(s.works) : '—';
    if (sl2) sl2.textContent = LP.formatLikes(s.likes != null ? s.likes : 0);
    if (sc2) sc2.textContent = s.collections != null ? String(s.collections) : '0';
    if (sf2) sf2.textContent = s.following != null ? String(s.following) : '0';
    LP.refreshIcons();
    // 顶栏（tabs）里引用：用最上面的变量，如果旧变量绑的是外面不存在的元素，需要重新给一个壳
    // 简化：tabHost 如果不存在真实元素就指向 root 下的
    const realTabHost = th2 || tabHost;
    if (tabHost && !tabHost.parentNode) { /* 旧元素失效了 */ }
    // 重新渲染 tabs & content（直接传 realTabHost 重写内部）
    function reRenderTabs() {
      if (!realTabHost) return;
      const tabs = [{ v: 'works', label: '作品', icon: 'image' }, { v: 'likes', label: '收藏', icon: 'heart' }, { v: 'collections', label: '合集', icon: 'bookmark' }];
      realTabHost.innerHTML = tabs.map((t) => {
        return '<button data-profile-tab="' + t.v + '" class="' + tabActive(t.v) + ' inline-flex items-center gap-2 px-4 h-9 rounded-lp-md text-sm font-medium border transition-colors"><i data-lucide="' + t.icon + '" class="w-4 h-4"></i>' + t.label + '</button>';
      }).join('');
      LP.refreshIcons();
      realTabHost.querySelectorAll('[data-profile-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeTab = btn.getAttribute('data-profile-tab');
          reRenderTabs();
          renderCurrentContent2();
        });
      });
    }
    // renderCurrentContent 也改成对 root 下的 gallery/empty 生效
    async function renderCurrentContent2() {
      if (!currentUser) return;
      const g = g2 || gallery;
      const e = e2 || empty;
      const eh = eh2 || emptyHint;
      if (activeTab === 'works') {
        try {
          const r = await LP.api.getUserPhotos('' + currentUser.id, { page: 1, size: 40 });
          renderGalleryOrEmpty2(r.items || [], 'TA 还没有上传作品。');
        } catch (_) { renderGalleryOrEmpty2([], 'TA 还没有上传作品。'); }
      } else if (activeTab === 'likes') {
        try {
          const r = await LP.api.getMyFavorites({ page: 1, size: 40 });
          renderGalleryOrEmpty2(r.items || [], '还没有收藏任何作品。');
        } catch (_) { renderGalleryOrEmpty2([], '还没有收藏任何作品。'); }
      } else if (activeTab === 'collections') {
        try {
          const r = await LP.api.listCollections({ page: 1, size: 40 });
          const items = r.items || [];
          if (!items.length) {
            if (g) g.innerHTML = '';
            if (e) { e.classList.remove('hidden'); if (eh) eh.textContent = '还没有创建合集。'; }
            return;
          }
          if (e) e.classList.add('hidden');
          g.innerHTML = items.map((c) => {
            const cover = (c.cover_photo && (c.cover_photo.url_thumb || c.cover_photo.url_medium || c.cover_photo.src)) || 'assets/image_0_r53wpn.jpg';
            return (
              '<div class="relative rounded-lp-lg overflow-hidden border border-lp-border bg-lp-surface shadow-lp-sm">' +
                '<div class="aspect-[4/3]"><img src="' + esc(cover) + '" alt="' + esc(c.title || '') + '" class="w-full h-full object-cover" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'"></div>' +
                '<div class="p-3 sm:p-4"><h3 class="font-medium text-lp-fg line-clamp-1">' + esc(c.title || '未命名合集') + '</h3><p class="text-xs text-lp-fg-subtle mt-1">' + (c.item_count || 0) + ' 张作品' + (c.visibility ? ' · ' + c.visibility : '') + '</p></div>' +
              '</div>'
            );
          }).join('');
          LP.refreshIcons();
        } catch (_) {
          if (e) { e.classList.remove('hidden'); if (eh) eh.textContent = '加载合集失败。'; }
        }
      }
      function renderGalleryOrEmpty2(items, emptyText) {
        if (!items || !items.length) {
          if (g) g.innerHTML = '';
          if (e) { e.classList.remove('hidden'); if (eh) eh.textContent = emptyText || '还没有内容。'; }
          return;
        }
        if (e) e.classList.add('hidden');
        LP.renderGallery(g, items);
      }
    }
    reRenderTabs();
    renderCurrentContent2();
  }

  loadProfile();
})();
