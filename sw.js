// Đặt tên phiên bản cache. Đổi tên này (vd: v2, v3) khi cập nhật code mới để trình duyệt làm mới cache.
const CACHE_NAME = 'ginonote-cache-v1';

// Danh sách các tệp nội bộ cần lưu về máy
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Sự kiện Install: Chạy lần đầu tiên, tải và lưu tất cả các tệp vào Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Đã mở cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Sự kiện Fetch: Bắt các yêu cầu mạng. Ưu tiên lấy từ Cache ra trước.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy tệp trong cache, trả về tệp đó ngay lập tức
        if (response) {
          return response;
        }
        // Nếu không có trong cache, mới tải từ internet
        return fetch(event.request);
      })
  );
});

// 3. Sự kiện Activate: Dọn dẹp cache cũ khi cập nhật phiên bản mới
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
