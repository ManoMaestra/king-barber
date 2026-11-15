// Cache de la app para que funcione sin internet.
// Al publicar una actualización, subir VERSION: los datos del usuario (localStorage) no se tocan.
const VERSION = 'kb-v15';
const FILES = ['./', './index.html', './logo.jpg', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== 'kb-share').map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // "Compartir" desde WhatsApp u otra app (Android): guarda la imagen o el texto y abre la Agenda.
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const c = await caches.open('kb-share');
      const img = form.get('image');
      if (img && img.size) await c.put('shared-image', new Response(img));
      const text = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join('\n');
      if (text) await c.put('shared-text', new Response(text));
      return Response.redirect('./index.html?share=1', 303);
    })());
    return;
  }

  if (e.request.method !== 'GET') return;
  // Red primero (así llegan las actualizaciones), cache si no hay internet.
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
