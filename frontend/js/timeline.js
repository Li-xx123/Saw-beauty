/* 风景光影 — timeline page: call /timeline/users/me when logged in, else fallback to /photos?sort=recommend grouped. */
(function () {
  'use strict';

  const LP = window.LP;
  if (!LP) return;
  const esc = LP.escapeHtml;

  const host = document.getElementById('timeline');
  if (!host) return;

  function entryHTML(w) {
    const img = w.src || w.thumb || '';
    return (
      '<div class="relative pl-6 sm:pl-8 reveal">' +
        '<span class="absolute -left-[6px] sm:-left-[7px] top-1 w-3 h-3 rounded-full bg-lp-primary ring-4 ring-lp-bg"></span>' +
        '<div class="rounded-lp-lg overflow-hidden border border-lp-border bg-lp-surface shadow-lp-sm">' +
          '<button type="button" data-photo-id="' + esc(w.id) + '" class="block w-full text-left group">' +
            '<img src="' + esc(img) + '" alt="' + esc(w.title) + '" class="w-full aspect-[16/9] object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'">' +
            '<span class="sr-only">查看 ' + esc(w.title) + '</span>' +
          '</button>' +
          '<div class="p-4 sm:p-5">' +
            '<div class="flex items-center gap-2 text-xs text-lp-fg-muted mb-1.5">' +
              '<i data-lucide="calendar" class="w-3.5 h-3.5"></i><span class="lp-mono">' + esc(w.date || '') + '</span>' +
            '</div>' +
            '<h3 class="lp-h3 text-lp-fg">' + esc(w.title) + '</h3>' +
            '<p class="text-sm text-lp-fg-muted mt-1 flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>' + esc(w.location || '—') + '</p>' +
            (w.camera ? '<p class="text-xs text-lp-fg-subtle mt-2 flex items-center gap-1"><i data-lucide="camera" class="w-3.5 h-3.5"></i>' + esc(w.camera) + '</p>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  async function loadTimeline() {
    host.innerHTML = '<div class="py-16 text-center text-sm text-lp-fg-muted"><i data-lucide="loader-2" class="w-5 h-5 mx-auto animate-spin mb-2"></i>加载时间轴中…</div>';
    LP.refreshIcons();

    let groups = [];
    let loggedIn = !!(LP.auth && LP.auth.isLoggedIn());
    if (LP.api) {
      // 登录用户：拉 GET /timeline/users/me（后端返回 [{date,count,photos}]）
      // 未登录：拉公开推荐列表 GET /photos?sort=recommend，按日期本地分组
      try {
        if (loggedIn) {
          const me = await LP.api.me();
          const res = await LP.api.getUserTimeline('' + me.id);
          groups = Array.isArray(res) ? res : (res && res.groups) || [];
        } else {
          const res = await LP.api.listPhotos({ sort: 'recommend', size: 50 });
          // 本地按 date 分组（taken_at 的 YYYY-MM-DD）
          const map = new Map();
          (res.items || []).forEach((p) => {
            const n = LP.normalizePhoto(p);
            const key = n.date || 'Unknown';
            if (!map.has(key)) map.set(key, { date: key, count: 0, photos: [] });
            const g = map.get(key);
            g.count += 1; g.photos.push(p);
          });
          groups = Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
        }
      } catch (err) {
        if (window.LP_DATA) groups = [{ date: '示例', count: window.LP_DATA.works.length, photos: window.LP_DATA.works }];
      }
    } else if (window.LP_DATA) {
      groups = [{ date: '示例', count: window.LP_DATA.works.length, photos: window.LP_DATA.works }];
    }

    // 展平渲染
    let html = '';
    const flatList = [];
    groups.forEach((g) => {
      html +=
        '<div class="mb-10 sm:mb-12 reveal">' +
          '<div class="flex items-center gap-3 mb-4 sm:mb-6">' +
            '<span class="lp-mono text-lg text-lp-primary">' + esc(String(g.date || '')) + '</span>' +
            '<span class="text-xs text-lp-fg-subtle">' + (g.count || 0) + ' 张</span>' +
            '<span class="flex-1 h-px bg-lp-border"></span>' +
          '</div>';
      const list = Array.isArray(g) ? g : (g.photos || []);
      list.forEach((p) => {
        const n = LP.normalizePhoto(p);
        if (!n) return;
        flatList.push(n);
        html += entryHTML(n);
      });
      html += '</div>';
    });
    if (!html) {
      html = '<div class="text-center py-20 text-sm text-lp-fg-muted">这里还空着。登录后，你上传过的每一张作品都会出现在自己的时间轴里。</div>';
    }
    host.innerHTML = html;
    LP.refreshIcons();
    LP.refreshReveals(host);

    // 点击：打开灯箱
    host.querySelectorAll('[data-photo-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-photo-id');
        const idx = flatList.findIndex((w) => w.id === id);
        if (idx !== -1) {
          const lb = flatList.map((n) => ({ id: n.id, src: n.src || n.thumb, title: n.title, location: n.location, date: n.date, camera: n.camera, likes: n.likes }));
          LP.openPhoto(lb, idx);
        }
      });
    });
  }

  loadTimeline();
})();
