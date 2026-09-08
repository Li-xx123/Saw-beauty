/* 风景光影 — API Client + JWT 鉴权。
 * 提供 window.LP.api 封装：所有请求自动带 Authorization，
 * 遇到 401 会用 refresh_token 自动换一次，仍失败则触发 LP.onAuthRequired()
 * （由 app.js 监听并弹登录框）。
 */
(function () {
  'use strict';

  const LP = (window.LP = window.LP || {});
  const BASE = '/api/v1';
  const LS_ACCESS = 'lp_token_access';
  const LS_REFRESH = 'lp_token_refresh';
  const LS_USER = 'lp_user_me'; // 缓存自己的 profile 小对象（{id,nickname,avatar,...}）

  /* ---------- Token 存取 ---------- */
  function clearAuth() {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
  }
  function setAuth(access, refresh, me) {
    if (access) localStorage.setItem(LS_ACCESS, access);
    if (refresh) localStorage.setItem(LS_REFRESH, refresh);
    if (me) localStorage.setItem(LS_USER, JSON.stringify(me));
  }
  function getAccess() { return localStorage.getItem(LS_ACCESS) || ''; }
  function getRefresh() { return localStorage.getItem(LS_REFRESH) || ''; }
  function getCachedMe() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
    catch (_) { return null; }
  }

  LP.auth = {
    isLoggedIn: () => !!getAccess(),
    clear: clearAuth,
    getCachedMe: getCachedMe,
  };

  /* ---------- 核心 fetch 包装 ---------- */
  let refreshPromise = null; // 全局 refresh 去重，防止并发 401 同时刷多次

  function authHeaders() {
    const h = {};
    const tok = getAccess();
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    return h;
  }

  function isJsonResponse(resp) {
    const t = (resp.headers.get('content-type') || '').toLowerCase();
    return t.indexOf('application/json') !== -1 || t.indexOf('+json') !== -1;
  }

  async function parseBody(resp) {
    if (resp.status === 204) return null;
    if (!resp.body) return null;
    if (isJsonResponse(resp)) return resp.json();
    // 其他类型（图片/文本等）按 text 返回兜底
    return resp.text();
  }

  async function refreshOnce() {
    // 串行化：如果另一个请求已经在刷，等它的结果
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const rt = getRefresh();
      if (!rt) { clearAuth(); return false; }
      try {
        const resp = await fetch(BASE + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!resp.ok) throw new Error('refresh rejected');
        const body = await resp.json();
        if (body.access_token) localStorage.setItem(LS_ACCESS, body.access_token);
        if (body.refresh_token) localStorage.setItem(LS_REFRESH, body.refresh_token);
        return true;
      } catch (_) {
        clearAuth();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  /**
   * 通用请求函数。
   * options: { method, headers, body, query, signal, onProgress, auth: true|false }
   * onProgress(evt) 仅在 body 为 FormData / Blob 时通过 XHR 提供。
   */
  async function request(path, opts) {
    opts = opts || {};
    const method = (opts.method || 'GET').toUpperCase();
    let url = BASE + path;
    if (opts.query) {
      const qs = new URLSearchParams();
      Object.keys(opts.query).forEach((k) => {
        const v = opts.query[k];
        if (v === undefined || v === null || v === '') return;
        if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
        else qs.append(k, String(v));
      });
      const s = qs.toString();
      if (s) url += '?' + s;
    }

    const useAuth = opts.auth !== false;
    const headers = Object.assign({}, opts.headers || {});
    if (useAuth) Object.assign(headers, authHeaders());

    // 若调用方要求进度回调，则走 XHR（fetch 目前没有上传进度 API）
    if (typeof opts.onProgress === 'function') {
      return xhrUpload(url, method, headers, opts.body, opts.signal, opts.onProgress);
    }

    let resp = await fetch(url, {
      method, headers, body: opts.body, signal: opts.signal || undefined,
    });

    // 401 → 尝试刷一次，然后重放原请求
    if (resp.status === 401 && useAuth) {
      const ok = await refreshOnce();
      if (ok) {
        const replayHeaders = Object.assign({}, opts.headers || {});
        Object.assign(replayHeaders, authHeaders());
        resp = await fetch(url, {
          method, headers: replayHeaders, body: opts.body, signal: opts.signal || undefined,
        });
      }
    }

    const data = await parseBody(resp);
    if (!resp.ok) {
      const err = new Error(
        (data && data.detail) || (typeof data === 'string' ? data : ('HTTP ' + resp.status))
      );
      err.status = resp.status;
      err.data = data;
      // 401 且 refresh 也失败：通知外部（app.js 应弹登录）
      if (resp.status === 401 && typeof LP.onAuthRequired === 'function') {
        try { LP.onAuthRequired(); } catch (_) { /* ignore */ }
      }
      throw err;
    }
    return data;
  }

  function xhrUpload(url, method, headers, body, signal, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      Object.keys(headers).forEach((k) => xhr.setRequestHeader(k, headers[k]));
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && typeof onProgress === 'function') {
          onProgress({ loaded: e.loaded, total: e.total, percent: e.loaded / e.total });
        }
      };
      xhr.onload = async function () {
        // 复用 401 逻辑
        if (xhr.status === 401) {
          const ok = await refreshOnce();
          if (ok) {
            // 重放（递归一次即可）
            try {
              const tok = getAccess();
              if (tok) headers['Authorization'] = 'Bearer ' + tok;
              const res2 = await xhrUpload(url, method, headers, body, signal, onProgress);
              return resolve(res2);
            } catch (e) { return reject(e); }
          } else {
            if (typeof LP.onAuthRequired === 'function') {
              try { LP.onAuthRequired(); } catch (_) { /* ignore */ }
            }
            const err = new Error('未登录');
            err.status = 401;
            return reject(err);
          }
        }
        let data = null;
        try {
          const ct = xhr.getResponseHeader('content-type') || '';
          if (xhr.responseText && (ct.indexOf('json') !== -1 || xhr.status >= 400)) {
            data = JSON.parse(xhr.responseText);
          } else {
            data = xhr.responseText;
          }
        } catch (_) { data = xhr.responseText; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else {
          const msg = (data && data.detail) || ('HTTP ' + xhr.status);
          const err = new Error(msg);
          err.status = xhr.status;
          err.data = data;
          reject(err);
        }
      };
      xhr.onerror = function () { reject(new Error('network error')); };
      xhr.onabort = function () { reject(new Error('aborted')); };
      if (signal) {
        signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }
      xhr.send(body);
    });
  }

  /* ---------- 具体 API 封装 ---------- */

  const api = {
    base: BASE,

    // ---- Auth ----
    async register({ email, password, nickname, bio }) {
      const body = await request('/auth/register', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname, bio: bio || '' }),
      });
      if (body.access_token) {
        localStorage.setItem(LS_ACCESS, body.access_token);
        localStorage.setItem(LS_REFRESH, body.refresh_token || '');
        // 拉一次个人资料缓存
        try { const me = await this.me(); setAuth(null, null, me); } catch (_) { /* ignore */ }
      }
      return body;
    },
    async login({ email, password }) {
      const body = await request('/auth/login', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (body.access_token) {
        localStorage.setItem(LS_ACCESS, body.access_token);
        localStorage.setItem(LS_REFRESH, body.refresh_token || '');
        try { const me = await this.me(); setAuth(null, null, me); } catch (_) { /* ignore */ }
      }
      return body;
    },
    logout() { clearAuth(); },

    // ---- Users ----
    me() {
      return request('/users/me').then((u) => {
        setAuth(null, null, u);
        return u;
      });
    },
    updateMe(patch) {
      return request('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      }).then((u) => { setAuth(null, null, u); return u; });
    },
    getUser(id) { return request('/users/' + encodeURIComponent(id)); },

    // ---- Photos ----
    listPhotos(params) {
      // params: sort(newest|popular|recommend), tag, page, size, author_id
      return request('/photos', { query: params || {} });
    },
    getPhoto(id) { return request('/photos/' + encodeURIComponent(id)); },
    updatePhoto(id, patch) {
      return request('/photos/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      });
    },
    deletePhoto(id) {
      return request('/photos/' + encodeURIComponent(id), { method: 'DELETE' });
    },
    /**
     * 上传照片。
     * @param {Object} p
     * @param {File} p.file
     * @param {string} p.title
     * @param {string} [p.description]
     * @param {string[]} [p.tags]
     * @param {number} [p.lat]
     * @param {number} [p.lng]
     * @param {'public'|'private'} [p.visibility]
     * @param {string} [p.place_name]
     * @param {(evt:{loaded:number,total:number,percent:number})=>void} [onProgress]
     */
    uploadPhoto(p, onProgress) {
      const fd = new FormData();
      fd.append('file', p.file);
      fd.append('title', p.title || '');
      if (p.description) fd.append('description', p.description);
      if (p.lat != null) fd.append('lat', String(p.lat));
      if (p.lng != null) fd.append('lng', String(p.lng));
      if (p.visibility) fd.append('visibility', p.visibility);
      if (p.place_name) fd.append('place_name', p.place_name);
      if (p.tags && p.tags.length) {
        // FastAPI Form List：多段同 key
        p.tags.forEach((t) => fd.append('tags', t));
      }
      return request('/photos/upload', {
        method: 'POST',
        body: fd,
        onProgress: onProgress || undefined,
      });
    },

    // ---- Likes ----
    toggleLike(photoId) {
      // 后端路由：POST /likes/photos/{id}；幂等 → 可兼作用"取消"信号，
      // 但 E2E 接口删除也是 /likes/photos/{id} DELETE，这里统一 toggle 的实现：
      // 先 POST 收藏。若前端需要再次点一下取消，可改用 deleteLike 配合调用方状态。
      return request('/likes/photos/' + encodeURIComponent(photoId), { method: 'POST' });
    },
    unlikePhoto(photoId) {
      return request('/likes/photos/' + encodeURIComponent(photoId), { method: 'DELETE' });
    },
    getMyFavorites(params) {
      return request('/likes/me', { query: params || {} });
    },

    // ---- Collections ----
    listCollections(params) { return request('/collections', { query: params || {} }); },
    createCollection(data) {
      return request('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
    },
    getCollection(id) { return request('/collections/' + encodeURIComponent(id)); },
    updateCollection(id, patch) {
      return request('/collections/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      });
    },
    deleteCollection(id) {
      return request('/collections/' + encodeURIComponent(id), { method: 'DELETE' });
    },
    addPhotoToCollection(colId, photoId) {
      return request(
        '/collections/' + encodeURIComponent(colId) + '/photos/' + encodeURIComponent(photoId),
        { method: 'POST' }
      );
    },
    removePhotoFromCollection(colId, photoId) {
      return request(
        '/collections/' + encodeURIComponent(colId) + '/photos/' + encodeURIComponent(photoId),
        { method: 'DELETE' }
      );
    },

    // ---- Timeline ----
    getUserTimeline(userId, params) {
      const u = encodeURIComponent(userId);
      const groups = request('/timeline/users/' + u, { query: params || {} });
      // 同时提供分页获取照片列表的路径（个人主页 Tab "作品" 用）
      return groups;
    },
    getUserPhotos(userId, params) {
      // 使用后端专用路由 GET /users/{id}/photos（带权限：他人看仅 public，自己看全部）
      return request('/users/' + encodeURIComponent(userId) + '/photos', {
        query: params || {},
      });
    },
    getUserFavorites(userId, params) {
      // 后端目前只有 /likes/me（查看自己的收藏）；他人收藏暂不开放
      if (userId === 'me' || userId == null) {
        return request('/likes/me', { query: params || {} });
      }
      // 非自己：暂时降级为返回空列表（Promise.resolve 装成统一 PaginatedResponse 格式）
      return Promise.resolve({ items: [], total: 0, page: 1, size: (params && params.size) || 20, pages: 0 });
    },

    // ---- Map ----
    mapClusters(params) { return request('/map/clusters', { query: params || {} }); },
    mapNearby(params) { return request('/map/nearby', { query: params || {} }); },
    mapBbox(params) { return request('/map/bbox', { query: params || {} }); },

    // ---- Search ----
    search(params) { return request('/search', { query: params || {} }); },
  };

  LP.api = api;
})();
