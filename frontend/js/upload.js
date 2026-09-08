/* 风景光影 — upload page: drag-drop preview + real API upload with progress. */
(function () {
  'use strict';

  const LP = window.LP;
  if (!LP) return;

  const form = document.getElementById('upload-form');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('preview');
  const previewImg = document.getElementById('preview-img');
  const previewName = document.getElementById('preview-name');
  const previewSize = document.getElementById('preview-size');
  const previewRemove = document.getElementById('preview-remove');
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progress-bar');
  const progressPct = document.getElementById('progress-pct');
  const progressLabel = document.getElementById('progress-label');
  const submitBtn = document.getElementById('submit-btn');

  const gpsBox = document.getElementById('gps-box'); // 可选：GPS 手动输入区域
  const latInput = document.getElementById('f-lat');
  const lngInput = document.getElementById('f-lng');

  let objectUrl = null;
  let currentFile = null;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function clearPreview() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    currentFile = null;
    if (preview) preview.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      LP.toast('请选择图片文件', { icon: 'alert-circle' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      LP.toast('图片不能超过 20MB', { icon: 'alert-circle' });
      return;
    }
    clearPreview();
    currentFile = file;
    objectUrl = URL.createObjectURL(file);
    if (previewImg) previewImg.src = objectUrl;
    if (previewName) previewName.textContent = file.name;
    if (previewSize) previewSize.textContent = formatSize(file.size);
    if (preview) preview.classList.remove('hidden');
    LP.refreshIcons();
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
    });
  }

  if (dropZone) {
    ['dragenter', 'dragover'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.add('border-lp-primary', 'bg-lp-surface-2');
      })
    );
    ['dragleave', 'dragend'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('border-lp-primary', 'bg-lp-surface-2');
      })
    );
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('border-lp-primary', 'bg-lp-surface-2');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
  }

  if (previewRemove) previewRemove.addEventListener('click', clearPreview);
  if (form) form.addEventListener('reset', () => setTimeout(clearPreview, 0));

  function readTagsFromChipsOrInput() {
    const tagsInput = document.getElementById('f-tags');
    if (!tagsInput) return [];
    return (tagsInput.value || '')
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!LP.api || !LP.auth.isLoggedIn()) {
        if (typeof LP.onAuthRequired === 'function') LP.onAuthRequired();
        else LP.toast('请先登录再发布', { icon: 'alert-circle' });
        return;
      }
      if (!currentFile) {
        LP.toast('请先选择一张照片', { icon: 'alert-circle' });
        return;
      }
      const titleEl = document.getElementById('f-title');
      const title = (titleEl && titleEl.value || '').trim();
      if (!title) {
        LP.toast('请填写标题', { icon: 'alert-circle' });
        if (titleEl) titleEl.focus();
        return;
      }
      const descEl = document.getElementById('f-desc');
      const locationEl = document.getElementById('f-location');
      const categoryEl = document.getElementById('f-category');
      const visibilityEl = document.getElementById('f-visibility');
      const payload = {
        file: currentFile,
        title: title,
        description: descEl ? descEl.value.trim() : '',
        place_name: locationEl ? locationEl.value.trim() : '',
        tags: readTagsFromChipsOrInput(),
        visibility: (visibilityEl && visibilityEl.value) || 'public',
      };
      // 如果选择了分类，把分类也塞进 tags 数组头部（不超过 10 项）
      if (categoryEl && categoryEl.value) {
        const v = String(categoryEl.value).trim();
        if (v && !payload.tags.includes(v)) payload.tags.unshift(v);
        payload.tags = payload.tags.slice(0, 10);
      }
      if (latInput && lngInput) {
        const la = parseFloat(latInput.value);
        const ln = parseFloat(lngInput.value);
        if (!isNaN(la) && !isNaN(ln)) {
          payload.lat = la; payload.lng = ln;
        }
      }
      submitBtn.disabled = true;
      if (progress) {
        progress.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPct.textContent = '0%';
        progressLabel.textContent = '上传中…';
      }
      try {
        const result = await LP.api.uploadPhoto(payload, function (evt) {
          const pct = Math.max(0, Math.min(100, Math.round((evt.percent || 0) * 100)));
          if (progressBar) progressBar.style.width = pct + '%';
          if (progressPct) progressPct.textContent = pct + '%';
          if (pct >= 100 && progressLabel) progressLabel.textContent = '处理中…';
        });
        LP.toast('作品已发布，感谢分享', { icon: 'check-circle-2' });
        form.reset();
        if (progress) progress.classList.add('hidden');
        setTimeout(() => { window.location.href = 'index.html'; }, 700);
      } catch (err) {
        const msg = (err && err.data && err.data.detail) ? err.data.detail : (err.message || '上传失败');
        LP.toast(typeof msg === 'string' ? msg : '上传失败', { icon: 'alert-circle' });
        if (progress) progress.classList.add('hidden');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // 如果用户允许位置权限，并且没手动填，把当前位置做默认（可选）
  if (gpsBox && (!latInput || !latInput.value) && 'geolocation' in navigator) {
    const fillBtn = document.getElementById('f-use-mylocation');
    if (fillBtn) {
      fillBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
            if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
            LP.toast('已填入当前位置', { icon: 'map-pin' });
          },
          () => { LP.toast('无法获取位置，可手动输入', { icon: 'alert-circle' }); },
          { timeout: 8000, enableHighAccuracy: false }
        );
      });
    }
  }

  LP.refreshIcons();
})();
