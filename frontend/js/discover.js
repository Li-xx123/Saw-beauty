/* 风景光影 — discover page: category/sort chips + filtered gallery from real API. */
(function () {
  'use strict';

  const LP = window.LP;
  if (!LP) return;

  const gallery = document.getElementById('discover-gallery');
  const empty = document.getElementById('discover-empty');
  const chipsHost = document.getElementById('chips');
  const resultLabel = document.getElementById('result-label');
  const resultCount = document.getElementById('result-count');
  const sortHost = document.getElementById('sort-chips');

  let activeCategory = '全部';
  let activeSort = 'newest';

  function renderChips(categories, selected, host, attrName) {
    if (!host) return;
    host.innerHTML = categories
      .map((c) => {
        const on = c.value === selected;
        const cls = on
          ? 'bg-lp-primary text-white border-lp-primary'
          : 'bg-lp-surface text-lp-fg-muted border-lp-border hover:bg-lp-surface-2 hover:text-lp-fg';
        return (
          '<button data-' + attrName + '="' + LP.escapeHtml(c.value) + '" class="' + cls + ' shrink-0 px-3.5 h-8 rounded-lp-full text-sm font-medium border transition-colors">' +
          c.label + '</button>'
        );
      })
      .join('');
    LP.refreshIcons();
    host.querySelectorAll('[data-' + attrName + ']').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-' + attrName);
        if (attrName === 'category') {
          activeCategory = val;
        } else {
          activeSort = val;
        }
        renderAll();
      });
    });
  }

  async function loadGallery() {
    if (!gallery) return;
    const params = { sort: activeSort, page: 1, size: 30 };
    if (activeCategory !== '全部') params.tag = activeCategory;
    gallery.innerHTML = '<div class="col-span-full py-16 text-center text-sm text-lp-fg-muted"><i data-lucide="loader-2" class="w-5 h-5 mx-auto animate-spin mb-2"></i>加载中…</div>';
    LP.refreshIcons();
    let items = [];
    let total = 0;
    if (LP.api) {
      try {
        const res = await LP.api.listPhotos(params);
        items = res.items || [];
        total = Number(res.total || items.length);
      } catch (err) {
        // 未登录等可降级：也可能无 token，不弹，用占位
        if (err && err.status === 401) { /* ignore */ }
        else if (window.LP_DATA) { items = window.LP_DATA.works; total = items.length; }
      }
    } else if (window.LP_DATA) {
      items = window.LP_DATA.works; total = items.length;
    }
    if (resultLabel) resultLabel.textContent = (activeCategory === '全部' ? '全部作品' : activeCategory) + ' · ' + (activeSort === 'popular' ? '最多收藏' : activeSort === 'recommend' ? '猜你喜欢' : '最新');
    if (resultCount) resultCount.textContent = total + ' 张';
    if (!items.length) {
      gallery.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    LP.renderGallery(gallery, items);
  }

  async function renderAll() {
    // 类别 chips：从 API 拉一把"所有"来聚合 tags；失败就用默认集合
    let tags = [];
    if (LP.api && chipsHost) {
      try {
        const res = await LP.api.listPhotos({ sort: 'newest', size: 100 });
        const set = new Set();
        (res.items || []).forEach((p) => (p.tags || []).forEach((t) => t && set.add(t)));
        tags = Array.from(set).slice(0, 8).map((t) => ({ value: t, label: t }));
      } catch (_) { tags = []; }
    }
    if (!tags.length) tags = [{ value: '山岳', label: '山岳' }, { value: '森林', label: '森林' }, { value: '海洋', label: '海洋' }, { value: '城市', label: '城市' }, { value: '沙漠', label: '沙漠' }, { value: '湖泊', label: '湖泊' }];
    const categories = [{ value: '全部', label: '全部' }].concat(tags);
    renderChips(categories, activeCategory, chipsHost, 'category');
    if (sortHost) {
      renderChips(
        [
          { value: 'newest', label: '最新' },
          { value: 'popular', label: '最热' },
          { value: 'recommend', label: '推荐' },
        ],
        activeSort,
        sortHost,
        'sort'
      );
    }
    loadGallery();
  }

  renderAll();
})();
