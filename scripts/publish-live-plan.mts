/**
 * Rebuilds public/live-seating-plan.json from the built-in layout and roster.
 *
 * The app prefers this bundled snapshot over its own defaults, so it has to be
 * regenerated whenever the zone layout or the roster in src/data changes —
 * otherwise the running app keeps showing the previous plan.
 *
 *   npx vite-node scripts/publish-live-plan.mts
 */
import { writeFileSync, readFileSync } from 'fs';
import { createDefaultPlan } from '../src/state/plan';

const OUT = 'public/live-seating-plan.json';

let publishedAt = new Date().toISOString();
try {
  publishedAt = JSON.parse(readFileSync(OUT, 'utf-8'))._publishedAt || publishedAt;
} catch {
  // No previous snapshot — stamp it as of now.
}

const plan = createDefaultPlan();
writeFileSync(OUT, JSON.stringify({ ...plan, _publishedAt: publishedAt }, null, 2), 'utf-8');

const locked = plan.attendees.filter((a) => a.seatLock).length;
console.log(
  `wrote ${OUT}: ${plan.seats.length} seats, ${plan.attendees.length} attendees ` +
    `(${locked} reserved), layout ${plan.layoutVersion}`
);
