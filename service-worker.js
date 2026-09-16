const CACHE_NAME="interrupt-v1";
const APP_SHELL=[
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./core/adaptive.js",
  "./core/storage.js",
  "./core/events.js",
  "./core/protection.js",
  "./locales/en.json",
  "./locales/ro.json",
  "./locales/fr.json",
  "./locales/de.json",
  "./locales/es.json",
  "./locales/it.json",
  "./icons/icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;

      return fetch(event.request).then(response=>{
        if(!response||response.status!==200||response.type==="opaque")return response;

        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>{
        if(event.request.mode==="navigate")return caches.match("./index.html");
        return new Response("",{status:503});
      });
    })
  );
});
