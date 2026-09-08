import { PlanState, normalisePlan } from '../state/plan';
import { neon } from '@neondatabase/serverless';

/**
 * Cloud Synchronization Service for AIIMS Kalyani Seating Arrangement
 *
 * Backed by Neon PostgreSQL Serverless Database (Global HTTPS, Zero Cost, Free Tier):
 * - Works across ALL Google accounts, browsers, operating systems, and mobile phones.
 * - Saves complete seating arrangements and guest rosters to PostgreSQL `seating_plan` table.
 * - Dual-layer fallback: Local Vite /api/plan + LocalStorage offline cache.
 */

// Dedicated Neon PostgreSQL cloud database for AIIMS Kalyani Seating Arrangement
const NEON_CONNECTION_STRING =
  'postgresql://neondb_owner:npg_rOokcM6j3msS@ep-wispy-tree-azlp3u6k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(NEON_CONNECTION_STRING, { disableWarningInBrowsers: true });

export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  source: 'cloud' | 'local_api' | 'static' | 'cache' | null;
  attendeeCount: number;
  error?: string | null;
}

/**
 * Publishes the current seating plan and guest roster to the cloud database.
 * Every device and Google account will immediately receive this plan.
 */
export async function publishPlanToCloud(plan: PlanState): Promise<{ success: boolean; error?: string }> {
  const payload = {
    ...plan,
    _publishedAt: new Date().toISOString(),
  };
  const jsonStr = JSON.stringify(payload);

  let success = false;
  let lastError: string | undefined;

  // 1. Neon PostgreSQL Cloud Database (Global sync for all Google accounts & phones)
  try {
    await sql`
      INSERT INTO seating_plan (key, data, updated_at)
      VALUES ('active_plan', ${jsonStr}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW();
    `;
    success = true;
  } catch (err: any) {
    console.warn('[CloudSync] Neon publish error:', err);
    lastError = err?.message || 'Neon cloud save failed';
  }

  // 2. Local network / dev server (/api/plan) fallback (only if Neon cloud was unreachable)
  if (!success) {
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
      });
      if (res.ok) {
        success = true;
      }
    } catch {
      // Expected on static deployments or offline
    }
  }

  // 3. Cache locally in current browser
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('aiims_seating_plan_v10', jsonStr);
      localStorage.setItem('aiims_kalyani_mobile_cached_plan', jsonStr);
      localStorage.setItem('aiims_last_cloud_publish', new Date().toISOString());
    } catch (e) {
      console.warn('[CloudSync] Local cache write error:', e);
    }
  }

  return { success, error: success ? undefined : lastError };
}

/**
 * Fetches the latest published plan from the cloud database.
 * Called on startup by all users, devices, and /seattracker mobile guests.
 */
export async function fetchLiveCloudPlan(): Promise<{
  plan: PlanState;
  source: 'cloud' | 'local_api' | 'static' | 'cache';
  updatedAt?: string;
} | null> {
  // 1. Primary: Neon PostgreSQL Cloud Database
  try {
    const rows = await sql`SELECT key, data, updated_at FROM seating_plan WHERE key = 'active_plan'`;
    if (rows && rows.length > 0 && rows[0].data) {
      const rawData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      if (rawData && rawData.seats && Array.isArray(rawData.seats)) {
        const normalised = normalisePlan(rawData);
        // Update local browser cache so subsequent loads are instant
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const cacheStr = JSON.stringify(normalised);
            localStorage.setItem('aiims_seating_plan_v10', cacheStr);
            localStorage.setItem('aiims_kalyani_mobile_cached_plan', cacheStr);
            localStorage.setItem('aiims_last_cloud_fetch', new Date().toISOString());
          } catch {}
        }

        return {
          plan: normalised,
          source: 'cloud',
          updatedAt: rows[0].updated_at ? String(rows[0].updated_at) : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[CloudSync] Neon cloud fetch failed, trying fallbacks:', err);
  }

  // 2. Secondary: Local dev / network server (/api/plan)
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
    // Continue to static file
  }

  // 3. Tertiary: Bundled static snapshot (./live-seating-plan.json)
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
    // Fall back to local cache
  }

  // 4. Quaternary: LocalStorage cache
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached =
        localStorage.getItem('aiims_seating_plan_v10') ||
        localStorage.getItem('aiims_kalyani_mobile_cached_plan');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.seats && Array.isArray(parsed.seats)) {
          return { plan: normalisePlan(parsed), source: 'cache' };
        }
      }
    } catch {}
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
