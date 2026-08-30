// ================================================================
//  Service Worker — Абсурдный Английский
// ================================================================

const CACHE_NAME = 'absurd-english-v1.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/favicon.ico'
];

// Устанавливаем кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование ресурсов...');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[SW] Установка завершена');
        return self.skipWaiting();
      })
  );
});

// Активация — очищаем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Активация завершена');
      return self.clients.claim();
    })
  );
});

// Перехват запросов — сначала кэш, потом сеть
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к внешним API (Cataas, шрифты Google)
  const url = new URL(event.request.url);
  if (url.hostname.includes('cataas.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Возвращаем из кэша, если есть
        if (cachedResponse) {
          return cachedResponse;
        }

        // Иначе загружаем из сети и кэшируем
        return fetch(event.request)
          .then((response) => {
            // Проверяем, что ответ валидный
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кэширования
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Не кэшируем внешние запросы
                if (!url.hostname.includes('cataas.com') && 
                    !url.hostname.includes('googleapis.com') &&
                    !url.hostname.includes('gstatic.com')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Если сеть недоступна и нет в кэше — показываем офлайн-страницу
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Push-уведомления (опционально)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Пора повторить английский! 📚',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('🤪 Абсурдный Английский', options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});