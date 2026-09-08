/* 风景光影 — LP_DATA 兼容层（后端接入后仅作兜底回退）。
 * 页面脚本优先调用 LP.api.*；当 API 不可用或失败时，
 * 这个极小的占位数据集能保证 UI 不白屏。*/
window.LP_DATA = (function () {
  const esc = (s) => String(s == null ? '' : s);
  const FALLBACK_WORKS = [
    { id: 'fb1', title: '示例作品·雪山', location: '暂无数据', category: '山岳', date: '2026-01-01', camera: '—', likes: 0, likesLabel: '0', src: 'assets/image_1_r53wpn.jpg' },
  ];
  const works = FALLBACK_WORKS.slice();
  const collections = [];
  const profile = {
    name: '未登录', handle: '', avatar: 'assets/image_0_r53wpn.jpg', cover: 'assets/image_1_r53wpn.jpg',
    tagline: '登录后查看个人主页', bio: '', location: '', website: '',
    stats: { works: 0, likes: '0', collections: 0, following: 0 },
  };
  const feed = works.slice();
  const timeline = works.slice();
  const mapMarkers = works.map((w) => ({ id: w.id, title: w.title, src: w.src, location: w.location }));
  return { works, collections, profile, feed, timeline, mapMarkers, _esc: esc };
})();
