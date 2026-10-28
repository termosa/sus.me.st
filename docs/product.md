# Product decisions — v1

A host panel for running **one** live game of classic sport mafia from a phone.

## Scope

- Phone-first, offline-first SPA. No backend.
- One game at a time; no history or scoring across games.
- Strict sport rules: FIIM baseline, see [rules.md](rules.md) (decisions in §14).
- Everyone speaks in seat order, on a timer.

## Interface

- English only.
- **Few words.** Prefer icons, illustrations and numbers over text. Seat numbers are the main identifiers on screen.
- Dark by default (see [tech.md](tech.md) §8).

## Roles and player counts

| Players | Citizens | Sheriff | Mafia | Don |
|---|---|---|---|---|
| 10 | 6 | 1 | 2 | 1 |
| 9  | 5 | 1 | 2 | 1 |

- Night 0 (acquaintance) never has a kill.
- 9 players: Night 1 has no shooting either; the Don's and Sheriff's checks still happen.

## Role dealing (card grid)

- All cards are shown face-down on screen, labelled with numbers.
- Cards are picked in seat order: the k-th card picked belongs to seat k.
- The host asks the player for a number and taps that card (or passes the phone).
- Tap 1: the card zooms in, covering the others.
- Tap 2: the card flips and reveals the role.
- Tap 3: the card hides and the view returns to the grid. The picked card is no longer shown; the remaining cards are renumbered from 1, so the numbers never show which cards were taken.

## Settings

- Night timers (checks, free sitting) are configurable; FIIM values by default.
- "Play cues in silent mode" (iOS), off by default because it pauses other audio.

## Deferred to later versions

- Manually assigning roles (host enters roles dealt with physical cards).
- Other roles and variants beyond Citizen / Sheriff / Mafia / Don.
- Recording who voted for whom (v1 records counts only).
- Game history and scoring.
