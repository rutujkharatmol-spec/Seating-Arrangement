import { PlanState, normalisePlan } from '../state/plan';

/**
 * Cloud Synchronization Service for AIIMS Kalyani Seating Arrangement
 *
 * Provides a resilient multi-tier cloud sync engine:
 * 1. Cloud REST Endpoint: Global real-time cloud storage accessible by any smartphone.
 * 2. Local/WiFi Dev Server: `/api/plan` served by Vite dev server when running on local network.
 * 3. Static Snapshot Fallback: `./live-seating-plan.json` bundled with web deployment.
 * 4. Local Offline Cache: LocalStorage for instant zero-latency loading.
 */

// A dedicated persistent key on KVdb (free, HTTPS, zero-setup public key-value store)
const CLOUD_KV_BUCKET = '6V472w51eXqA5C5tEwS1Lq';
const CLOUD_KV_KEY = 'aiims_kalyani_live_plan';
const CLOUD_URL = `https://kvdb.io/${CLOUD_KV_BUCKET}/${CLOUD_KV_KEY}`;

export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  source: 'cloud' | 'local_api' | 'static' | 'cache' | null;
  attendeeCount: number;
  error?: string | null;
}

/**
 * Publishes the current plan to the cloud so all mobile guests see it.
 */
export async function publishPlanToCloud(plan: PlanState): Promise<{ success: boolean; error?: string }> {
  const payload = {
    ...plan,
    _publishedAt: new Date().toISOString(),
  };
  const bodyStr = JSON.stringify(payload);

  let success = false;
  let lastError: string | undefined;

  // 1. Publish to local dev/network server (/api/plan)
  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });
    if (res.ok) {
      success = true;
    }
  } catch {
    // /api/plan may not exist if deployed statically (GitHub Pages), continue to cloud
  }

  // 2. Publish to Global Cloud Endpoint (KVdb)
  try {
    const cloudRes = await fetch(CLOUD_URL, {
      method: 'POST',
      body: bodyStr,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (cloudRes.ok) {
      success = true;
    } else {
      lastError = `Cloud responded with status ${cloudRes.status}`;
    }
  } catch (err: any) {
    lastError = err?.message || 'Network error syncing to cloud';
  }

  // Record published timestamp in localStorage
  if (success) {
    localStorage.setItem('aiims_last_cloud_publish', new Date().toISOString());
  }

  return { success, error: success ? undefined : lastError };
}

/**
 * Fetches the latest published plan from the cloud for mobile users.
 */
export async function fetchLiveCloudPlan(): Promise<{ plan: PlanState; source: 'cloud' | 'local_api' | 'static' | 'cache' } | null> {
  // 1. Try local dev/network server (/api/plan)
  try {
    const res = await fetch('/api/plan', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.seats && Array.isArray(data.seats)) {
        return { plan: normalisePlan(data), source: 'local_api' };
      }
    }
  } catch {
    // Continue to cloud
  }

  // 2. Try Global Cloud Endpoint (KVdb)
  try {
    const cloudRes = await fetch(`${CLOUD_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (cloudRes.ok) {
      const data = await cloudRes.json();
      if (data && data.seats && Array.isArray(data.seats)) {
        return { plan: normalisePlan(data), source: 'cloud' };
      }
    }
  } catch {
    // Continue to static file
  }

  // 3. Try bundled static file (./live-seating-plan.json)
  try {
    const staticRes = await fetch('./live-seating-plan.json', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (staticRes.ok) {
      const data = await staticRes.json();
      if (data && data.seats && Array.isArray(data.seats)) {
        return { plan: normalisePlan(data), source: 'static' };
      }
    }
  } catch {
    // Fall back to null (caller uses local cache)
  }

  return null;
}

/**
 * Returns the shareable mobile link for attendees to find their seat.
 */
export function getMobileKioskUrl(): string {
  if (typeof window === 'undefined') return '/#seattracker';
  const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
  return `${base}/#seattracker`;
}
