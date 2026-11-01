/* ==========================================================================
   みんなの モントモ — サービスワーカー

   やくわり
     ・ゲームの ファイルを とっておく → ネットが なくても あそべる
     ・あたらしい ばんが でたら、がめんに「あたらしい バージョンが あります」を だす

   ★ ばんごうは じぶんで かきかえない。`node tools/bump.mjs 0.9` で
     この ファイル・js/game.js・version.json・index.html を いっしょに あげる。
     （この ファイルの なかみが かわらないと ブラウザが こうしんに きづきません）
   ========================================================================== */

const APP_VERSION = '0.10';
const CACHE_NAME = 'montomo-' + APP_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/changelog.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).catch(() => { }));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('montomo-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* まず ネット（ブラウザの キャッシュも つかわない）、だめなら とっておいた ぶん */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.endsWith('version.json')) return; // ばんごうの かくにんは いつも ネット
  e.respondWith(
    fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => { }); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

/* がめんの「こうしんする」ボタンから よばれる */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
