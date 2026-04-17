// Nhập thư viện Dexie.js để sử dụng IndexedDB bên trong Service Worker
importScripts('https://unpkg.com/dexie/dist/dexie.js');

// =====================================================================
// PHẦN 1: CACHING & OFFLINE (Từ code cũ
// =====================================================================
const CACHE_NAME = 'ginonote-cache-v2'; // Đổi thành v2 để ép cập nhật cache

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // './icon-192.png', // 
  // './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Ép Service Worker mới hoạt động ngay lập tức
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Đã mở cache v2');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Chỉ can thiệp vào các request nội bộ (cùng domain), bỏ qua các API của Google
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            console.log('[SW] Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Giúp SW kiểm soát các tab đang mở ngay lập tức
});


// =====================================================================
// PHẦN 2: BACKGROUND SYNC (ĐỒNG BỘ NGẦM LÊN GOOGLE DRIVE)
// =====================================================================

// Khởi tạo Database giống với script.js
const db = new Dexie('GinoNoteDB');
db.version(1).stores({
  notes: 'id, updatedAt, syncStatus',
  images: 'fileName',
  settings: 'key' // Cần bảng này để lưu Token Google Drive (vì SW không đọc được localStorage)
});

// Lắng nghe sự kiện đồng bộ từ trình duyệt khi có mạng
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    console.log('[SW] Mạng đã ổn định! Bắt đầu đồng bộ ngầm...');
    event.waitUntil(doBackgroundSync());
  }
});

// Hàm thực hiện đẩy dữ liệu
async function doBackgroundSync() {
  try {
    // 1. Lấy danh sách các ghi chú đang chờ đồng bộ
    const pendingNotes = await db.notes.where('syncStatus').equals('pending').toArray();
    
    if (pendingNotes.length === 0) {
      console.log('[SW] Không có dữ liệu pending nào cần đồng bộ.');
      return;
    }

    // 2. Lấy Access Token từ IndexedDB
    const tokenRecord = await db.settings.get('gdrive_token');
    if (!tokenRecord || !tokenRecord.value) {
      console.warn('[SW] Không tìm thấy Token, hủy đồng bộ ngầm. Vui lòng đăng nhập lại.');
      return;
    }
    const token = tokenRecord.value;

    console.log(`[SW] Đang đẩy ${pendingNotes.length} ghi chú lên Drive...`);

    // 3. Đóng gói thành file Delta JSON (Giống cách làm trong file gốc)
    const syncStartTime = Date.now();
    const deltaFileName = `ginonote_delta_${syncStartTime}.json`;
    const deltaBlob = new Blob([JSON.stringify(pendingNotes)], { type: 'application/json' });

    const metadata = { name: deltaFileName, parents: ['appDataFolder'] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', deltaBlob, deltaFileName);

    // 4. Gửi lên Google Drive
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: form
    });

    if (response.ok) {
      // 5. Nếu thành công, cập nhật trạng thái trong Dexie thành 'synced'
      const ids = pendingNotes.map(n => n.id);
      await db.notes.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
      console.log('[SW] Đồng bộ ngầm thành công!');
    } else {
      if (response.status === 401) {
        console.error('[SW] Token hết hạn.');
        // Xóa token hết hạn
        await db.settings.delete('gdrive_token'); 
      } else {
        console.error('[SW] Lỗi đẩy dữ liệu lên Drive:', response.statusText);
      }
      throw new Error('Upload failed'); // Ném lỗi để trình duyệt thử lại Sync sau
    }

  } catch (error) {
    console.error('[SW] Đồng bộ ngầm thất bại. Sẽ thử lại khi có mạng.', error);
    throw error; // Bắt buộc ném lỗi để Service Worker biết là chưa xong và hẹn lịch thử lại
  }
}
