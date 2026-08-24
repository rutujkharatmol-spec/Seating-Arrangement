# AIIMS Kalyani — Auditorium Seating Arrangement

A visual planner for the 763-seat AIIMS Kalyani auditorium. Lay out the zones,
seat your guests, and print the charts, gate sheets and passes for the day.

## Running it

```bash
npm install
npm run dev      # opens on http://localhost:5173
```

```bash
npm run build    # production build into dist/
npm run preview  # serve that build locally
```

## The four tabs

| Tab | What it is for |
| --- | --- |
| **Seating map** | The floor plan. Click a seat to edit it in the panel on the right. |
| **Setup** | The zone wizard, the seat editor, and volunteer checkpoints. |
| **Guest list** | Everyone attending. Import a CSV, then auto-seat them. |
| **Print** | Auditorium chart, A–Z guest sheet, per-gate usher sheets, seat passes. |

## The quickest way to build a plan

1. **Setup wizard** — say how many VIPs, faculty, awardees and so on you expect.
   The zones are laid out across the auditorium for you.
2. **Guest list → Import CSV** — paste or upload your list of names. Each row
   needs a name; a zone (`vip`, `faculty`, `awardees`, …) and a seat are optional.
3. **Auto-seat** — every guest without a seat is placed in the best free seat of
   their own zone: closest to the stage, closest to the centre aisle. Anyone who
   does not fit is reported rather than squeezed in somewhere wrong.
4. **Adjust by hand** on the map — click a seat, or Shift-drag a box around a
   group of them.
5. **Print** what you need.

## Working on the map

- **Click** a seat to open it in the editing panel.
- **Shift + drag** a box to select many seats; add `Ctrl` to add to the selection.
- **Drag** to move the map, **scroll** to zoom. Past about 170% the chair icons
  turn into readable seat numbers.
- With a seat selected you can grab **its whole row** or **its whole zone** in
  one click, then change them all together.

### Shortcuts

| Key | Does |
| --- | --- |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `/` | Jump to the search box |
| `Enter` in search | Zoom the map to the first match |
| `Esc` | Clear the selection, or close a dialog |

## Saving your work

The plan saves itself in this browser as you go. **Plan → Save backup file**
writes the whole thing — seats, guests, volunteers, zone counts — to one dated
`.json` file, and **Plan → Open backup file** reads it back. Use that to keep a
copy before big changes, or to move a plan to another computer.

The strip above the map tells you whether the plan is ready: who still has no
seat, who is sitting outside their own zone, and any zone with more guests than
it has seats.

## How it is put together

```
src/
  App.tsx                  every action, and the state they all share
  state/plan.ts            the saved plan: load, save, repair, seat↔guest join
  hooks/useHistory.ts      undo / redo
  utils/autoSeat.ts        automatic seating, and the plan health checks
  utils/seatAlgorithms.ts  turns the wizard's answers into zones
  utils/exportHelpers.ts   CSV and JSON in and out
  data/                    the master blueprint, zone colours, presets
  components/              map, editor, guest list, print
```

One rule holds the data together: **a seat never stores who is sitting in it.**
Only `attendee.seatId` records that, and the map joins the two at render time.
So the two can never drift out of step, and one seat can never hold two people.
