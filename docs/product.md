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
- Sounds, Voice and Hints switches, all on by default.
- Settings open from the start screen and from the in-game menu. Night timer changes apply to the running game from its next timer on; a timer not yet started takes the new length at once.

## Sound and voice

- The voice calls each step: a timed step when its timer starts, any other step as it begins.
- Timer cues rise in pitch as time runs out: a low bell at halfway, two beeps at 10 s left (5 s on timers under 50 s), a tick at 2 s and 1 s, and a long tone at the end.
- A falling chime starts the night, a rising one the day.

## Night music

- Five free (CC0) tracks come with the app and work offline: Noir jazz (first by default) and four synthwave tracks (Synthwave, Midnight drive, Blue street, Eighties). They are steady and dense, without quiet passages, so they cover table noise; all loop without a gap in loudness. Sources are in `public/music/CREDITS.md`.
- The host adds their own audio files (stored on the device in IndexedDB, so they work offline) from the music button on the start screen or in the game header. Added files can be deleted; built-in tracks can be hidden instead. Hidden tracks are listed under "Hidden (n)", where they can be shown again, and next/previous at night skips them.
- Tracks are reordered by dragging their grip (or with the arrow keys on it). The order is the order of next/previous at night; when no track was picked, the first one plays.
- Any track can be renamed by double-tapping it (the first tap picks it): Enter, the check button or tapping away saves, Escape cancels, and an empty name brings back the track's own.
- One track is chosen at a time. It loops through each night, fading in as night falls and out at morning; the choice can change before or during any night.
- The voice lowers the music while it speaks.
- During nights a bar under the header has previous track, play/pause and next track. A pause holds until resumed or the next night.
- A "Night music" setting turns it off altogether.

## Voting

- A scoreboard shows one tile per candidate with their count; a 0–10 keypad (with ✓ as its 12th key) enters the count for the highlighted tile and moves on to the next, in nomination order. Tapping a tile edits it again. Counts that would take the total past the table are greyed out; the last candidate gets the rest (V-7). The raise vote uses the same keypad.

## Deferred to later versions

- Manually assigning roles (host enters roles dealt with physical cards).
- Other roles and variants beyond Citizen / Sheriff / Mafia / Don.
- Recording who voted for whom (v1 records counts only).
- Game history and scoring.
