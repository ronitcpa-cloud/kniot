var CACHE = 'kniot-v2';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* דף האפליקציה: תמיד בודק מול השרת (עוקף שמירה של שירות האחסון) */
function fetchPage(req){
  return fetch(req.url.split('#')[0], {cache: 'no-cache', credentials: 'same-origin'}).then(function(res){
    if(!res.redirected) return res;   // ספארי לא מקבל תשובה עם הפניה לדף
    return res.blob().then(function(b){
      return new Response(b, {status: res.status, statusText: res.statusText, headers: res.headers});
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request, url = req.url;
  if(req.method !== 'GET') return;
  if(url.indexOf('supabase.co') !== -1) return;   // never cache data calls
  var isPage = req.mode === 'navigate' || /index\.html(\?|#|$)/.test(url);
  e.respondWith(
    (isPage ? fetchPage(req) : fetch(req)).then(function(res){
      if(res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){ return m || caches.match('./index.html'); });
    })
  );
});
