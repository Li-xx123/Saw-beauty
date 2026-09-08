/* 风景光影 — reusable gallery renderer + interactions.
 * 兼容：传入列表元素可以是后端 PhotoListItem 或旧 LP_DATA 占位对象；
 *       渲染前统一规范化 → { id, src, thumb, title, location, likes, liked, date, camera, category }
 * 新增：点击 like-btn 时会真正调后端 toggleLike，失败则乐观回滚。 */
(function () {
  'use strict';

  const LP = (window.LP = window.LP || {});
  const esc = LP.escapeHtml || ((s) => String(s == null ? '' : s));

  LP.normalizePhoto = function (p) {
    if (!p) return null;
    // 后端：{ id, public_id, title, url_thumb, url_medium, place_name, like_count, view_count, taken_at, owner{nickname, avatar_url}, tags, camera_make, camera_model }
    // 旧 LP_DATA：{ id, src, title, location, likes, date, camera, category }
    const pid = p.public_id != null ? String(p.public_id) : (p.id != null ? String(p.id) : '');
    const src = p.url_medium || p.url_thumb || p.src || p.url || '';
    const thumb = p.url_thumb || p.thumb || src;
    return {
      _raw: p,
      id: pid,
      raw_id: p.id || null,
      src: src,
      thumb: thumb,
      title: p.title || '',
      location: p.place_name || p.location || '',
      likes: Number(p.like_count != null ? p.like_count : (p.likes || 0)),
      liked: !!p.liked,
      date: (p.taken_at && new Date(p.taken_at).toISOString().slice(0, 10)) || p.date || '',
      camera: (p.camera_make && (p.camera_make + (p.camera_model ? ' ' + p.camera_model : ''))) || p.camera || '',
      category: (p.tags && p.tags[0]) || p.category || '',
      owner: p.owner
        ? { nickname: p.owner.nickname || '', avatar: p.owner.avatar_url || '' }
        : (p.ownerName ? { nickname: p.ownerName, avatar: '' } : null),
    };
  };

  LP.galleryCard = function (w, delay) {
    const n = (w && w._raw) ? w : LP.normalizePhoto(w);
    if (!n) return '';
    const imgSrc = n.thumb || n.src || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 3%22><rect fill=%22%23eee%22 width=%224%22 height=%223%22/></svg>';
    const likedAttr = n.liked ? 'true' : 'false';
    return (
      '<a href="#" data-photo-id="' + esc(n.id) + '" data-photo-raw-id="' + (n.raw_id != null ? esc(String(n.raw_id)) : '') + '" class="lp-card group relative rounded-lp-lg overflow-hidden block bg-lp-surface-2 shadow-lp-sm reveal" style="--reveal-delay:' + (delay || 0) + 'ms">' +
        '<img src="' + esc(imgSrc) + '" alt="' + esc(n.title) + '" class="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'">' +
        '<div class="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">' +
          '<div class="flex items-center justify-between">' +
            '<div class="min-w-0">' +
              '<h3 class="text-white font-medium text-sm truncate">' + esc(n.title) + '</h3>' +
              '<p class="text-white/70 text-xs truncate flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i>' + esc(n.location || '—') + '</p>' +
            '</div>' +
            '<button type="button" class="lp-like-btn flex items-center gap-1 text-white hover:text-lp-primary transition-colors shrink-0" data-liked="' + likedAttr + '" data-likes="' + n.likes + '" aria-label="收藏/取消收藏">' +
              '<i data-lucide="heart" class="w-4 h-4' + (n.liked ? ' fill-current' : '') + '"></i><span class="text-sm lp-mono" data-likes-label>' + LP.formatLikes(n.likes) + '</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  };

  LP.renderGallery = function (container, list) {
    if (!container) return;
    const norm = (list || []).map((x) => LP.normalizePhoto(x)).filter(Boolean);
    container._lpList = norm;
    container.innerHTML = norm.map((w, i) => LP.galleryCard(w, Math.min(i * 60, 240))).join('');
    LP.refreshIcons();
    LP.refreshReveals(container);
    if (container.dataset.lpWired) return;
    container.dataset.lpWired = '1';
    container.addEventListener('click', async (e) => {
      const likeBtn = e.target.closest('.lp-like-btn');
      if (likeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const wasLiked = likeBtn.getAttribute('data-liked') === 'true'; // 操作前的状态
        // 先乐观更新 UI
        const card = likeBtn.closest('[data-photo-raw-id]') || likeBtn.closest('[data-photo-id]');
        const rawId = card && card.getAttribute('data-photo-raw-id'); // DB id (int)
        LP.toggleLike(likeBtn);
        if (LP.api && rawId) {
          try {
            if (!wasLiked) {
              // 之前未收藏 → 现在已收藏 → POST 收藏（幂等）
              await LP.api.toggleLike(rawId);
            } else {
              // 之前已收藏 → 现在未收藏 → DELETE 取消
              try { await LP.api.unlikePhoto(rawId); } catch (_) { /* 幂等 */ }
            }
          } catch (err) {
            LP.toast(err.message || '操作失败', { icon: 'alert-circle' });
            // 回滚：再 toggle 一次回到原状态
            LP.toggleLike(likeBtn);
          }
        } else if (!LP.auth.isLoggedIn()) {
          // 未登录：至少保证登录弹窗能出现
          if (typeof LP.onAuthRequired === 'function') LP.onAuthRequired();
        }
        return;
      }
      const card = e.target.closest('[data-photo-id]');
      if (card) {
        e.preventDefault();
        const list = container._lpList;
        const idx = list.findIndex((x) => x.id === card.getAttribute('data-photo-id'));
        if (idx !== -1) {
          // 把 normalize 的对象转换为 openPhoto 需要的 { src, title, location, date, camera, likes }
          const forLightbox = list.map((n) => ({
            id: n.id,
            src: n.src || n.thumb,
            title: n.title,
            location: n.location,
            date: n.date,
            camera: n.camera,
            likes: n.likes,
          }));
          LP.openPhoto(forLightbox, idx);
        }
      }
    });
  };
})();
