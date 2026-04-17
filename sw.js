// Nhập thư viện Dexie.js để sử dụng IndexedDB bên trong Service Worker
importScripts('https://unpkg.com/dexie/dist/dexie.js');

const CACHE_NAME = 'ginonote-cache-v3'; // Tăng version để trình duyệt cập nhật
const urlsToCache = [
  './', 
  './index.html', 
  './style.css', 
  './script.js', 
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Đã mở cache v3');
        return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { 
          if (key !== CACHE_NAME) {
              console.log('[SW] Xóa cache cũ:', key);
              return caches.delete(key); 
          }
      })
    ))
  );
  self.clients.claim();
});

// ==========================================
// BACKGROUND SYNC: ẢNH & GHI CHÚ
// ==========================================
const db = new Dexie('GinoNoteDB');
db.version(1).stores({
  notes: 'id, updatedAt, syncStatus',
  images: 'fileName, syncStatus',
  settings: 'key' 
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    console.log('[SW] Mạng ổn định! Khởi động Background Sync...');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    const tokenRecord = await db.settings.get('gdrive_token');
    if (!tokenRecord || !tokenRecord.value) {
      console.warn('[SW] Thiếu Token Google Drive. Hủy đồng bộ.');
      return;
    }
    const token = tokenRecord.value;

    // --- BƯỚC 1: ĐỒNG BỘ ẢNH (BLOB) ---
    const pendingImages = await db.images.where('syncStatus').equals('pending').toArray();
    if (pendingImages.length > 0) {
      console.log(`[SW] Đang upload ${pendingImages.length} ảnh...`);
      for (const img of pendingImages) {
        const metadata = { name: img.fileName, parents: ['appDataFolder'] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', img.blob, img.fileName);

        const imgRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: form
        });

        if (imgRes.ok) {
          // Upload xong, đổi trạng thái ảnh thành synced
          await db.images.update(img.fileName, { syncStatus: 'synced' });
        } else {
          console.error(`[SW] Lỗi upload ảnh ${img.fileName}`);
          throw new Error('Image upload failed');
        }
      }
    }

    // --- BƯỚC 2: ĐỒNG BỘ GHI CHÚ (JSON DELTA) ---
    const pendingNotes = await db.notes.where('syncStatus').equals('pending').toArray();
    if (pendingNotes.length > 0) {
      console.log(`[SW] Đang upload ${pendingNotes.length} ghi chú...`);
      const syncStartTime = Date.now();
      const deltaFileName = `ginonote_delta_${syncStartTime}.json`;
      const deltaBlob = new Blob([JSON.stringify(pendingNotes)], { type: 'application/json' });

      const metadata = { name: deltaFileName, parents: ['appDataFolder'] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', deltaBlob, deltaFileName);

      const noteRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: form
      });

      if (noteRes.ok) {
        const ids = pendingNotes.map(n => n.id);
        await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        console.log('[SW] Đồng bộ ngầm ghi chú thành công!');
      } else {
        if (noteRes.status === 401) await db.settings.delete('gdrive_token');
        throw new Error('Note upload failed');
      }
    }

  } catch (error) {
    console.error('[SW] Tiến trình đồng bộ gặp lỗi. Sẽ thử lại sau.', error);
    throw error; // Bắt buộc throw để trình duyệt tự động lên lịch thử lại (Retry)
  }
}
