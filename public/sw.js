/* Service Worker v1 : met en cache la coquille de l'application uniquement.
   Les données personnelles vivent dans IndexedDB et ne sont JAMAIS touchées par ce nettoyage. */
const VERSION = "bc-shell-v1";
const BIBLE_CACHE = "bc-bible-v1"; // jamais supprimé par l'activation : textes téléchargés par l'utilisateur
const BOOK_FILE = /^\/bibles\/[^/]+\/[A-Z0-9]{3}\.json$/;
const SHELL = ["/", "/lire", "/defis", "/communaute", "/profil", "/profil/journal", "/profil/favoris", "/profil/rappels", "/connexion", "/logo.svg", "/icon-192.png", "/manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("bc-shell-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (BOOK_FILE.test(url.pathname)) { // cache-first : le texte d'une révision donnée ne change pas (?r=N)
    e.respondWith(caches.open(BIBLE_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/")))
  );
});
