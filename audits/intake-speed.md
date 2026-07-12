# Audit 2 — Intake Speed (<30 seconds, the #1 non-functional requirement)

**Date:** July 2026 · **Method:** tap/keystroke count from the actual intake screen code (`src/app/(tabs)/jobs/index.tsx`), per flow. Not yet timed on a device — see protocol at the bottom.

## Current cost per flow (counted from code)

### Flow 1 — returning car, single known customer (the bread-and-butter case)
| Step | Cost |
|---|---|
| Tap **+New** tab | 1 tap |
| Type plate | ~7 keystrokes |
| Wait for lookup (debounce + query) | ~1s |
| Customer | **0** (auto-selected when exactly one) ✅ |
| Tap service(s) | 1 tap each |
| Price | **0** (auto-summed) ✅ |
| **From date** | **10 keystrokes** (`2026-07-12`) ❌ |
| **From time** | **5 keystrokes** (`14:00`) ❌ |
| To date/time | **0** (auto-suggested from durations) ✅ |
| Tap **Create** | 1 tap |

**≈ 3 taps + ~22 keystrokes.** A careful typist lands at 30–45 seconds — **the requirement is currently missed, and typing the date/time is more than half the cost.** Everything else in the flow is already well-optimized.

### Flow 2 — new car, new customer
Flow 1 + make/model (optional, skippable) + customer name & phone (~15–25 keystrokes, unavoidable). Realistically 50–70s. Acceptable — this happens once per car, ever.

### Flow 3 — from the calendar day view
`/jobs?date=...` prefills the **date** ✅ but not the time. Best current path.

### Flow 4 — from a vehicle profile ("new order for this vehicle")
`/jobs?plate=...` prefills the plate ✅. Good fast path; keep.

## Recommendations (ordered by seconds saved per unit of work)

| # | Change | Saves | Effort |
|---|---|---|---|
| R1 | **Default From = today + now rounded up to the next 15 min** (when no `date` param). The common case becomes *zero* date keystrokes — most orders are booked for "now-ish" or edited slightly | ~10–15s | ~10 lines |
| R2 | **Quick chips** under the date/time fields: `Today` `Tomorrow` / `Now` `+1h` `09:00` `14:00`. Typing becomes the fallback, not the default | ~5s on non-today bookings | small |
| R3 | Set `keyboardType="numbers-and-punctuation"` (or platform date pickers later) on the date/time inputs — currently full alpha keyboard | ~2s of keyboard-switching | 1 line each |
| R4 | **Repeat-last-order** (already backlog item 11i): for regulars, services + price + assignee prefill from the car's last job — intake collapses to plate + confirm | ~8s for repeat customers | backlog |
| R5 | After a successful plate match, auto-scroll to the services section | ~1s + less thinking | tiny |

**With R1–R3 alone, Flow 1 drops to ≈ 3 taps + ~7 keystrokes — comfortably under 20 seconds.** R1 is the single highest-value UX change available anywhere in the app right now.

## What's already right (don't regress these)
- Single auto-capitalizing plate field as the entry point; debounced auto-lookup (no "search" button).
- Auto-selected single customer; auto-summed price that stays editable; auto-suggested end time that stops suggesting once hand-edited.
- Prefill fast paths from calendar day and vehicle profile.

## Measurement protocol (run during pilot, Phase D)
1. Real phone, real hands (Carbros staff, not the developer).
2. Stopwatch from Home screen → job visible on calendar. 5 runs each of Flow 1 and Flow 2, median counts.
3. Record per-run where the pauses happen (watch their thumbs, not the screen).
4. Target: Flow 1 median **< 25s** post-R1–R3; re-audit if missed.
5. Log results in this file: ☐ measured on ____, Flow 1 median ____s, Flow 2 median ____s.
