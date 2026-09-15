/**
 * Keeps the seat tracker working when the hall's wifi does not.
 *
 * Deliberately network-first for everything that can change — the page itself
 * and the seating plan — so a cached copy can never pin a guest to yesterday's
 * seat. The cache is only ever the fallback for when the network fails or is
 * too slow. Build assets are content-hashed, so those are safe to serve from
 * the cache immediately.
 */
const VERSION = 'aiims-seating-v2';
const PLAN_URL = 'live-seating-plan.json';
const NETWORK_TIMEOUT_MS = 3500;

/**
 * The shell, the plan, and the hashed bundles the shell pulls in.
 *
 * The bundle filenames change on every build, so they are read out of
 * index.html rather than hard-coded. Without them the worker would serve the
 * shell offline and then fail on the first <script>, leaving a blank page —
 * which is exactly the failure this is meant to prevent.
 */
async function warmCache() {
  const cache = await caches.open(VERSION);
  const urls = new Set(['./', './index.html', './' + PLAN_URL]);

  try {
    const res = await fetch('./index.html', { cache: 'no-cache' });
    if (res.ok) {
      const html = await res.text();
      for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const href = m[1];
        if (href.startsWith('/assets/') || href.startsWith('./assets/')) urls.add(href);
      }
    }
  } catch {
    // Offline at install time: whatever is already cached still stands.
  }

  // One at a time, so a single 404 cannot throw the whole warm-up away the
  // way cache.addAll would.
  await Promise.allSettled([...urls].map((u) => cache.add(u)));
}

self.addEventListener('install', (event) => {
  // Never block installing on the warm-up — a kiosk opened on a bad connection
  // should still end up with a registered worker.
  event.waitUntil(warmCache().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Resolves with the network response, or rejects once the timeout passes. */
function fromNetwork(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Looks a request up in the cache.
 *
 * Matching on the Request object alone is not enough: a module script is
 * fetched with different mode/credentials than the plain GET that filled the
 * cache, and any Vary header then turns a perfectly good entry into a miss —
 * which sends the request to a network that is not there. So ignore Vary, and
 * fall back to matching on the URL on its own.
 */
async function fromCache(request) {
  return (
    (await caches.match(request, { ignoreVary: true })) ||
    (await caches.match(request.url, { ignoreVary: true })) ||
    (await caches.match(request.url, { ignoreVary: true, ignoreSearch: true }))
  );
}

function stash(request, response) {
  if (!response || !response.ok) return;
  const copy = response.clone();
  caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
}

async function networkFirst(request) {
  try {
    const response = await fromNetwork(request, NETWORK_TIMEOUT_MS);
    stash(request, response);
    return response;
  } catch {
    const cached = await fromCache(request);
    if (cached) return cached;
    // A navigation with nothing cached for that exact URL still gets the shell,
    // so the app boots and can show its own offline state.
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html', { ignoreVary: true });
      if (shell) return shell;
    }
    throw new Error('offline and nothing cached');
  }
}

async function cacheFirst(request) {
  const cached = await fromCache(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    stash(request, response);
    return response;
  } catch (err) {
    // Offline and genuinely not cached — let the browser report it.
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never touch other origins: the QR image service, fonts, the Neon API.
  if (url.origin !== self.location.origin) return;

  // The page and the plan must always prefer the live copy.
  if (request.mode === 'navigate' || url.pathname.endsWith(PLAN_URL)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Hashed build assets never change under the same name.
  if (/\.(?:js|css|woff2?|png|svg|jpe?g|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
