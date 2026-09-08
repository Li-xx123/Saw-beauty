/* 风景光影 — map exploration page:
 * 由于没有 PostGIS/在线地图 JS，用"附近照片列表 + 距离显示"实现 MVP。
 * 用户输入经纬度或点"使用我的位置"→ GET /map/nearby?lat=&lng=&radius= */
(function () {
  'use strict';

  const LP = window.LP;
  if (!LP) return;
  const esc = LP.escapeHtml;

  const host = document.getElementById('map-list');
  const summary = document.getElementById('map-summary');
  const empty = document.getElementById('map-empty');
  const latInput = document.getElementById('map-lat');
  const lngInput = document.getElementById('map-lng');
  const radiusInput = document.getElementById('map-radius');
  const goBtn = document.getElementById('map-go');
  const hereBtn = document.getElementById('map-here');

  const DEFAULT_CENTER = { lat: 30.2741, lng: 120.1551, name: '杭州（默认）' }; // 可按需改

  function formatDistance(m) {
    if (m == null || isNaN(m)) return '';
    if (m < 1000) return Math.round(m) + ' m';
    return (m / 1000).toFixed(1) + ' km';
  }

  function renderList(items, lat, lng) {
    if (!host) return;
    if (!items.length) {
      if (host) host.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    host._lpList = items.map((p) => LP.normalizePhoto(p)).filter(Boolean);
    host.innerHTML = items
      .map((p, i) => {
        const n = host._lpList[i];
        const d = (p && p.distance_m != null) ? formatDistance(p.distance_m) : '';
        return (
          '<a href="#" data-photo-id="' + esc(n.id) + '" data-photo-raw-id="' + (n.raw_id != null ? esc(String(n.raw_id)) : '') + '" class="grid grid-cols-[120px,1fr] sm:grid-cols-[180px,1fr] gap-3 sm:gap-4 p-2 rounded-lp-lg border border-lp-border bg-lp-surface shadow-lp-sm hover:shadow-lp-md transition-shadow reveal">' +
            '<img src="' + esc(n.thumb || n.src) + '" alt="' + esc(n.title) + '" class="rounded-lp-md w-full aspect-[4/3] object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'assets/image_0_r53wpn.jpg\'">' +
            '<div class="min-w-0 py-1 sm:py-2 flex flex-col">' +
              '<div class="flex items-start justify-between gap-2 mb-1">' +
                '<h3 class="font-medium text-lp-fg truncate">' + esc(n.title) + '</h3>' +
                (d ? '<span class="shrink-0 text-xs lp-mono text-lp-primary">' + d + '</span>' : '') +
              '</div>' +
              '<p class="text-xs text-lp-fg-muted flex items-center gap-1 mb-2"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i><span class="truncate">' + esc(n.location || '—') + '</span></p>' +
              (n.owner ? '<p class="text-xs text-lp-fg-subtle flex items-center gap-1"><i data-lucide="user" class="w-3.5 h-3.5"></i><span class="truncate">' + esc(n.owner.nickname || '匿名摄影师') + '</span></p>' : '') +
            '</div>' +
          '</a>'
        );
      })
      .join('');
    if (summary) {
      summary.textContent =
        '在 ' + (lat && lng ? '(' + Number(lat).toFixed(3) + ', ' + Number(lng).toFixed(3) + ') 附近 ' : '推荐区域' +
        '找到 ' + items.length + ' 张作品';
    }
    LP.refreshIcons();
    LP.refreshReveals(host);
    if (host.dataset.lpWiredMap) return;
    host.dataset.lpWiredMap = '1';
    host.addEventListener('click', (e) => {
      const card = e.target.closest('[data-photo-id]');
      if (!card) return;
      e.preventDefault();
      const list = host._lpList;
      const idx = list.findIndex((x) => x.id === card.getAttribute('data-photo-id'));
      if (idx !== -1) {
        const lb = list.map((n) => ({ id: n.id, src: n.src || n.thumb, title: n.title, location: n.location, date: n.date, camera: n.camera, likes: n.likes }));
        LP.openPhoto(lb, idx);
      }
    });
  }

  async function loadNearby(lat, lng, radiusKm) {
    if (!host) return;
    host.innerHTML = '<div class="py-10 text-center text-sm text-lp-fg-muted"><i data-lucide="loader-2" class="w-5 h-5 mx-auto animate-spin mb-2"></i>搜索附近作品中…</div>';
    LP.refreshIcons();
    let items = [];
    try {
      const params = { lat: lat, lng: lng, radius_km: Number(radiusKm) || 50, page: 1, size: 50 };
      const res = await LP.api.mapNearby(params);
      items = res.items || [];
    } catch (err) {
      // 附近接口失败 → 降级拉全部
      try {
        const r = await LP.api.listPhotos({ sort: 'recommend', size: 30 });
        items = r.items || [];
      } catch (_) { items = window.LP_DATA ? window.LP_DATA.works : []; }
    }
    renderList(items, lat, lng);
  }

  function readAndGo() {
    let lat = latInput ? parseFloat(latInput.value) : NaN;
    let lng = lngInput ? parseFloat(lngInput.value) : NaN;
    const radiusKm = radiusInput ? parseFloat(radiusInput.value) || 50 : 50;
    if (isNaN(lat) || isNaN(lng)) {
      lat = DEFAULT_CENTER.lat; lng = DEFAULT_CENTER.lng;
      if (latInput) latInput.value = String(lat);
      if (lngInput) lngInput.value = String(lng);
    }
    loadNearby(lat, lng, radiusKm);
  }

  if (goBtn) goBtn.addEventListener('click', readAndGo);
  if (hereBtn) {
    hereBtn.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        LP.toast('当前环境不支持定位，请手动输入', { icon: 'alert-circle' });
        return;
      }
      hereBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          hereBtn.disabled = false;
          if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
          if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
          loadNearby(pos.coords.latitude, pos.coords.longitude, (radiusInput ? parseFloat(radiusInput.value) : null) || 50);
        },
        (err) => {
          hereBtn.disabled = false;
          LP.toast((err && err.message) || '无法定位，已使用默认位置', { icon: 'alert-circle' });
          readAndGo();
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  // 初始：用默认中心，或者未登录直接用推荐
  if (latInput) latInput.value = String(DEFAULT_CENTER.lat);
  if (lngInput) lngInput.value = String(DEFAULT_CENTER.lng);
  if (!(LP.auth && LP.auth.isLoggedIn()) && LP.api) {
    // 未登录：走降级推荐列表
    host.innerHTML = '<div class="py-10 text-center text-sm text-lp-fg-muted"><i data-lucide="loader-2" class="w-5 h-5 mx-auto animate-spin mb-2"></i>加载推荐作品…</div>';
    LP.refreshIcons();
    LP.api.listPhotos({ sort: 'recommend', size: 30 }).then((r) => {
      renderList(r.items || [], null, null);
    }).catch(() => {
      const fb = window.LP_DATA ? window.LP_DATA.works : [];
      renderList(fb, null, null);
    });
  } else {
    readAndGo();
  }
})();
