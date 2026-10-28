# Sport Mafia: rules spec for the host app

This spec is the source for the app's state machine. Each rule has an ID (for example `V-7`) that code and tests can cite.

**Baseline.** The baseline is the FIIM *Official rules of the game "Mafia"* (Russian edition dated 2026-02-01) [F-RU], plus the official commentary from the FIIM Referee Committee (СК ФИИМ) [F-C]. FIIM is the federation behind Mafia World Tour (MWT) and is the de-facto international standard. Where other federations differ, the spec lists them as **Variants**: Russian Federation of Mafia (РФМ, 2026) [RFM], Asia League (2026-07-18) [ASIA], and Polemica (online) [POL]. Where the spec picks one, it says **Recommendation**.

**Not covered:** tournament scoring (points, penalties in points, compensation). The app runs one game.

Terminology: *red* = Citizen + Sheriff. *Black* = Mafia + Don. *Host* = judge (судья/ведущий). *Removal* = disqualification from the table (удаление/дисквалификация).

---

## 1. Setup

| ID | Rule |
|---|---|
| S-1 | **10-player standard** [F-RU 1.1]: 7 red (6 Citizen + 1 Sheriff) and 3 black (2 Mafia + 1 Don). |
| S-2 | **9-player house variant** (product decision; no sport federation defines one): 6 red (5 Citizen + 1 Sheriff) and 3 black (2 Mafia + 1 Don). **Night 1 has no shooting**; the Don's and Sheriff's checks still happen. See §11. |
| S-3 | Seats get numbers 1..N. Seating is drawn at random or set by the schedule [F-RU 4.1.1]. Every seat has a number plate. Numbers run around the table in seating order. **Convention:** clockwise, so speaking order is ascending and wraps from N to 1. |
| S-4 | A player's number never changes during the game. Seats of players who have left keep their numbers. They are skipped, never renumbered. |
| S-5 | Roles are secret. A player who leaves the game does **not** have their role revealed [F-RU 4.4.13, 4.5.4]. All roles are revealed only at game end. |
| S-6 | Dealing [F-RU 4.1.2–4.1.3]: the host announces "Наступает ночь" and everyone puts on masks. The host wakes players one at a time in seat order. Each player picks a card by its position and sees it, then puts the mask back on. **App:** the phone shows N face-down cards. The host hands the phone to each seat in order, the player taps a card, sees the role, and hides it. Everyone else stays masked. [RFM 4.1.4] caps the pick at 10 s per player. **Decided:** cards are picked in seat order, so the k-th card picked belongs to seat k. A picked card disappears from the grid; the remaining cards keep their numbers. See [product.md](product.md). |

## 2. Night 0 ("договорка", acquaintance night)

**No kill and no checks happen on Night 0.** This is true in every source: the first night is only for acquaintance, and shooting starts on the next night [F-RU 4.2, 4.5.2; RFM 4.5.9; ASIA 4.2; POL]. In the protocol, the first *shooting* night is called the "second game night" [F-RU 4.5.9, 8.2].

Sequence. Host speech commands are from [F-REC]:

| # | Step | Who | Duration |
|---|---|---|---|
| N0-1 | "Просыпается Дон / Просыпается мафия". All black players take off their masks and see each other. **The Don gestures that he is the Don** and sets the shooting order for the coming nights. | black | **exactly 60 s** ("У мафии одна минута") [F-RU 4.2.1]. [RFM]: the host warns at 10 s left. |
| N0-2 | "Мафия удаляется". Black players put their masks on. | black | — |
| N0-3 | "Шериф обозначает себя жестом". The Sheriff shows the host a gesture. In the 2026 edition the mask stays on. | Sheriff | a few seconds. Variant: the FIIM 2025 English edition lets the Sheriff take off the mask and look around the table for up to **20 s**. [RFM] and [ASIA] also let the Don signal himself to the host with mask on. |
| N0-4 | "Свободная посадка". Free sitting: masks stay on, hands stay above the table, and all night-behaviour rules apply. | all | **30 s** [F-RU 4.2.4]. Variants: 40 s [ASIA], 60 s [RFM]. |
| N0-5 | "Утро". Go to Day 1. | — | — |

N0 has no host input. Black players already know each other from the screen, so the app only runs the timers.

## 3. Day: discussion

| ID | Rule |
|---|---|
| D-1 | Each player in the game gets **one 60 s speech** per day for discussion and nominating [F-RU 4.3.1]. A player ends early with "Пас" or "Спасибо" [F-RU 4.3.5]. |
| D-2 | **Speaking order** is seating order [F-RU 4.3.2]. **Day 1 opens with player #1.** Each later day opens with **the next player after whoever spoke first on the previous day**. |
| D-3 | **Opener resolution (app rule):** the opener is the first seat in the game, going clockwise from `(previous day's actual opener + 1)`. Day 1 starts the search at seat 1. The rule text is literal: the next day's search starts from the *actual* previous opener, not the nominal one. Example: Day 2 should open at #2, but #2 was killed, so #3 opens. Day 3 then opens at #4 (if #4 is in the game). |
| D-4 | Players who have left the game (killed, voted out, removed) are skipped. |
| D-5 | **Nominating** (выставление) is allowed only during a player's own speech. The player uses the present tense: "Я выставляю игрока №X". The nomination counts only when the host says **"Принято [X]"** [F-RU 4.4.2]. |
| D-6 | **One nomination per player per day** [F-RU 4.4.3]. A nomination **cannot be withdrawn** [RFM 4.4.2]. |
| D-7 | **Nominating a player who is already nominated** is not accepted. The host doesn't say "Принято", and the player may nominate someone else during the same speech [ASIA 4.4.1]. If a player names several numbers, only the first one that isn't already nominated is accepted [RFM 4.4.2]. Nominating a player who is out of the game is not accepted. |
| D-8 | The candidate list is **ordered by when each nomination was accepted** [F-RU 4.4.4]. |
| D-9 | **Nominations only last for the current day.** Nothing carries over to the next day. Kills happen only at night, so a nomination is never "withdrawn because someone was killed". If a nominee or nominator is **removed** during the day, that day's vote is cancelled anyway (F-7). |
| D-10 | **3-foul silence:** see F-3. The silenced player loses their speech but **may still nominate**. [ASIA 4.4.3] allows a gesture or the bare phrase. [RFM 5.5] allows a 10 s window for the nomination only, and any extra word earns the 4th foul. |
| D-11 | **Self-nomination is allowed.** The rules say a player may nominate "any player" and don't ban nominating oneself (decision Q5). |

## 4. Voting

### 4.1 Main vote

| ID | Rule |
|---|---|
| V-1 | The vote happens after the discussion round and is held **only among the nominated players** [F-RU 4.4.1]. |
| V-2 | **No nominations:** there is no vote, and the game goes to night. |
| V-3 | **Day 1 with exactly one nominee:** there is **no vote** [F-RU 4.4.10]. This applies only to the first game day. |
| V-4 | **Day 2 or later with exactly one nominee:** every vote goes to that player (see V-7), so the nominee **is eliminated**. FIIM treats the result as fixed as soon as the last speaker leaves a single nominee [F-C vote-cancel]. **App:** skip the hand count and eliminate the nominee. |
| V-5 | Candidates are called in nomination order [F-RU 4.4.4]. Script [F-REC]: "Мы приступаем к голосованию. Выставлены: … Повторяю: …". Then for each candidate: "За игрока №X… Спасибо". Each candidate gets about 1.5 s of hand time. |
| V-6 | **Every player in the game votes exactly once**, including the candidates themselves. A player may vote against only one candidate [F-RU 4.4.7]. A vote is a fist on the table. |
| V-7 | **A player who doesn't vote has their vote counted against the last candidate** [F-RU 4.4.8]. Deliberately not voting earns a foul (F-5). **App:** the last candidate gets `alive − sum(votes for earlier candidates)`. The host only enters counts for candidates 1..k−1, or may enter all counts and the app checks the total. |
| V-8 | Voting continues through the last candidate even after one candidate has a decisive majority [F-C last-nomination]. The only exception is when every player has already voted, because the remaining counts are then zero. This matters for the record, not for the result. |
| V-9 | **The candidate with the most votes is eliminated** [F-RU 4.4.11]. This is a plurality, not a majority of the table. |

### 4.2 Ties ("перестрелка", "автокатастрофа", "попил")

| ID | Rule |
|---|---|
| T-1 | If two or more candidates tie for the most votes, **each tied candidate gets a 30 s defence speech** in nomination order. Then there is a **re-vote among the tied candidates only**, in the same order [F-RU 4.4.12, 4.4.12.1]. V-6, V-7 and V-8 apply, and votes nobody casts go to the last tied candidate. |
| T-2 | A player with 3 fouls who is in a tie **does get the 30 s speech** [F-RU 7.5]. |
| T-3 | If the re-vote ties again **among fewer candidates**, the new tied set gets another 30 s each and another re-vote. This repeats [F-RU 4.4.12.2]. |
| T-4 | If the re-vote ties again **among exactly the same candidates**, the host asks: **"Кто за то, чтобы все голосуемые игроки покинули игровой стол?"** This is the raise vote (подъём) [F-RU 4.4.12.3]. |
| T-5 | **Raise-vote threshold:** all eliminated if the yes-votes are **more than half of the players in the game**: `yes > alive/2`. Not raising a hand counts as no. Exactly half, or fewer, means everyone stays and the game goes to night [F-RU 4.4.12.3; ASIA 4.4.13.3 says the same explicitly]. |
| T-6 | **Raise votes that are not held** [F-RU 4.4.12.4, 7.8]: (a) when the tie includes **every player in the game**, and (b) **3 players when there are 9 at the table**. In both cases, a repeated tie means everyone stays and the host announces night. |
| T-7 | Variants for T-6. [RFM 4.4.18–21]: there is no raise vote for half the table (5 of 10, 4 of 8, 3 of 6) or for all players. At 3 players, a double tie goes straight to night [RFM 4.4.13.4]. [ASIA 4.4.17–19]: on Day 1 at most 2 players can be raised; no 3 of 9; never more than half the table. **Decided:** FIIM T-6 only. |
| T-8 | Everyone eliminated by a raise vote gets their last minute (L-1) in nomination order. "In nomination order" is an app convention; no source states it. |

### 4.3 When the vote result is fixed

This matters for removals (F-7). Source: [F-C vote-cancel].

The result is fixed at the first of these moments:
1. A candidate has a decisive majority and will leave whatever the remaining votes are.
2. More than half of the hands are up for a raise.
3. "Спасибо" ends a raise vote that didn't pass. The result is then "everyone stays".
4. On Day 2 or later, the last speaker leaves a single nominee (V-4).

If no vote is held (no nominee, or a single nominee on Day 1), the result is fixed when the host **announces night**.

## 5. Last words (прощальная / последняя минута)

| ID | Rule |
|---|---|
| L-1 | A player voted out gets **60 s** of last words, right after the vote [F-RU 4.4.13]. |
| L-2 | A player killed at night gets **60 s** of last words **in the morning**, before the day's discussion [F-RU 4.5.4, 4.5.9]. |
| L-3 | A player **removed** for a 4th foul or a disqualifying offence gets **no last words** [F-RU 6.5]. |
| L-4 | If the vote or kill **ends the game**, the leaving player **still gets the full 60 s** before the game ends [F-RU 7.9]. |
| L-5 | Roles are not revealed after last words. |
| L-6 | Variant [RFM 4.4.15, 4.5.11]: a 20 s "протокол" follows the last minute. All players wear masks while the leaving player says numbers for the record. FIIM has nothing like this. Not recommended. |

## 6. Night: shooting nights (Night 1 onward)

Sequence for every night after Night 0 [F-RU 4.5; F-REC]:

| # | Step | Duration | Host records |
|---|---|---|---|
| N-1 | "Наступает ночь / В городе ночь". Everyone puts on masks. [RFM]: 5 s to put on masks. | — | — |
| N-2 | **Shooting.** "Мафия выходит на охоту". The host calls seat numbers **1..N** in order. Each black player in the game, masked, "shoots" by raising a finger-gun when the number of their target is called. | about 1 s per number | Each black player's target: a number, *none*, or *multiple*. |
| N-3 | **Kill check:** the target dies **only if every black player in the game shot exactly once, all at the same player**. If anyone shot someone else, shot more than once, or didn't shoot, it is a **miss** and nobody dies [F-RU 4.5.4–4.5.5]. If only one black player is left, their single shot decides. Black players may shoot one of their own (самострел); that is legal. | — | killed seat, or miss |
| N-4 | "Мафия удаляется". | — | — |
| N-5 | **Don's check.** "Просыпается Дон". The Don takes off his mask and shows a seat number on his fingers. The host **nods if it is the Sheriff and shakes his head if not** [F-RU 4.5.6]. "Дон засыпает". | **10 s** [F-RU 4.2.2]. Variant: 15 s [RFM]. | Don's target and the result (Sheriff yes/no) |
| N-6 | **Sheriff's check.** "Просыпается Шериф". The Sheriff shows a seat number. The host answers **thumb up (red)** or **thumb down (black)** [F-RU 4.5.7]. "Шериф засыпает". | **10 s** [F-RU 4.2.3]. Variant: 15 s [RFM]. | Sheriff's target and the result (red/black) |
| N-7 | **Best move**, only if it applies (§7). The kill is announced while it is still night. | 20 s | three numbers |
| N-8 | "Утро" (morning). The host announces the kill ("Игрок №X убит") or the miss. The killed player's last words follow (L-2), then the discussion. | — | — |

Notes:
- N-a: The Don and the Sheriff get one check each per night [F-RU 4.5.8]. Either may check any seat. Checking an eliminated or already-checked player is allowed; it only costs them scoring penalties.
- N-b: **If the Don or the Sheriff is out of the game, run steps N-5 and N-6 anyway, with full timers.** Roles are never revealed (S-5), so skipping a step would leak information. No rule states this; it is standard host practice and follows from S-5.
- N-c: The Don checks for the Sheriff only (yes/no). The Sheriff checks the team: the Don shows as *black*.
- N-d: The kill takes effect when shooting resolves (N-3). The victim is "killed", sleeps on, and leaves at morning [F-RU 1.4: a player leaves at the moment of the vote result or night kill]. The win check runs then (W-3), but the victim still gets the best move if eligible and the last words.

## 7. Best move (лучший ход, ЛХ)

| ID | Rule |
|---|---|
| B-1 | **Who:** the player killed on the **first shooting night** (Night 1, called the "second game night" in the rules) [F-RU 4.5.9, 8.2]. |
| B-2 | **Not given** if **2 or more players left by vote on Day 1** [F-RU 7.10, 8.2.5]. |
| B-3 | If Night 1 is a miss, **nobody gets a best move in this game**. A later first kill doesn't get one [F-PROT 1.6.1; ASIA 6.11.6]. |
| B-4 | **When:** at the end of that night, after the Sheriff's check and before morning. The host turns the music off and announces: "Ночь продолжается. Игрок №X, вас убили. Проснитесь. У вас 20 секунд на лучший ход". The player takes off the mask and names **three seat numbers** they believe are black. They have **up to 20 s**, and the host calls "5 секунд" near the end [F-C lh-rules]. The host repeats the numbers back with "Принято №, №, №". The player sleeps again, the host announces "Утро", and the killed player's last minute follows. |
| B-5 | Numbers once named cannot be changed. Any other talk ends the best move: only the numbers already named count [F-RU 8.2.2–8.2.3]. |
| B-6 | Scoring only: 3 correct black numbers = +0.7 and 2 = +0.5 for a red player [F-RU 8.2.4]. The best move doesn't affect the game state. **App:** record it and show it in the game summary. |
| B-7 | Variant [POL]: an online "завещание" (will) is open to every leaving player. That is not sport rules; ignore it. |

## 8. Fouls, removal and other sanctions

### 8.1 Escalation

| ID | Rule |
|---|---|
| F-1 | Fouls add up over the whole game; they don't reset each day. Several fouls committed at once add up [F-RU 6.3.2]. |
| F-2 | **1st and 2nd foul:** no game effect. |
| F-3 | **3rd foul: the player loses their next speech** (their "nearest minute") but **keeps the right to nominate** (D-10) [F-RU 6.4]. The 3rd foul is announced at once ("Игрок №X, третий фол") [F-REC]. Which speech is lost, following [ASIA 4.3.3]: if the 3rd foul comes **before** the player's speech in the current round, they lose that speech; if it comes **during or after** it, they lose their speech on the next day. The silence is served **once**. After that the player speaks normally. |
| F-4 | **Exceptions to F-3:** (a) in a tie the player **does** get the 30 s defence speech [F-RU 7.5]; (b) if only **3 or 4 players** are in the game at the time of the lost speech, the player gets **30 s** instead of 0 [F-RU 7.6]. |
| F-5 | **4th foul = immediate removal, without last words** [F-RU 6.5]. |
| F-6 | A **disqualifying foul** (§8.3) also means immediate removal without last words [F-RU 6.5]. |
| F-7 | **A removal cancels a vote.** If a player is removed and they are not the player leaving by today's vote or tonight's kill: (a) if today's vote result is **not yet fixed** (§4.3), **today's vote is not held**, and if it is in progress it is stopped [F-RU 7.1]; (b) if the result **is** fixed (for example during last words, or at night), **the next day's vote is not held** [F-RU 7.2]. **A vote can be cancelled only once:** several removals in the same window cancel one vote, not one each. If several players are removed before a vote, that vote is cancelled and the next day's vote still happens [F-C vote-cancel]. On Day 1 with no nominee or a single nominee, a removal before night uses up Day 1's (non-)vote, and Day 2's vote stays [F-C vote-cancel]. |
| F-8 | The discussion continues after a removal: the remaining speeches happen. The cancelled vote is skipped and the game goes to night. During tie speeches [RFM 4.4.17]: if a non-candidate is removed, the tied candidates finish their speeches and the game goes to night; if a tied candidate is removed, the remaining tied candidates still get their 30 s and the game goes to night. |
| F-9 | **Removal at night** [F-C night-disqual]. If the offence comes *before* the host starts calling numbers, the player leaves at once, can't be killed, and the next day's vote is cancelled. If it comes *during* shooting and the black players shot that player, the host records **both the kill and the removal**: the player was "killed and disqualified", the kill counts, and **next day's vote is held**. A black player's shot made after their own offence is ignored. A removal during the Don's check is **announced only after the Sheriff's check**, so the host doesn't reveal who the Sheriff is. |
| F-10 | After a game-deciding vote or kill, the result **can't change**. Later disqualifications are penalised but don't change the outcome [F-RU 6.9, 7.9]. |

### 8.2 Offences that earn a foul [F-RU 6.6]
1. Speaking outside one's own minute, including interjections, whispers, and readable lip movements.
2. Excessive gesturing. Practice is to warn first and foul on repeats [F-C hand-play-etc].
3. Touching another player during the day.
4. Banging on the table, or unethical behaviour toward players or the host.
5. Arguing with the host.
6. During voting: pulling the hand back before "Спасибо/Стоп", or putting the hand down before the candidate is called. A hand pulled back still counts as a vote [F-RU 4.4.9].
7. Gesturing or appealing to others during the voting phase.
8. Breaking voting procedure: voting against several candidates, or not voting when told to put remaining hands on the last candidate.
9. Refusing to take off the mask when the host asks.

### 8.3 Disqualifying offences: immediate removal, no last words [F-RU 6.7]
1. Leaving the table.
2. Touching another player at night.
3. Signalling to the Don or Sheriff at night.
4. Insulting players, the host or spectators.
5. Peeking at night, even unintentionally.
6. Talking or calling out at night, or any other breach of night behaviour.
7. Crying at the table.
8. Out-of-game ethical or religious appeals ("честное слово, я красный", "видит Бог…", "умоляю, проголосуй со мной").
9. Using an invalid voting form (palm, finger, elbow…).
10. Deliberate peeking, or getting information by any other out-of-game means.
11. Asking someone to name, or not name, a player in the best move.
12. Pointing to an influence on the best move to prove one's role.
13. Whispering secret day information directly into a neighbour's ear.
14. Hiding speech by using a foreign language.
15. Obscene language, or the word "суицид".
16. Any attempt to gain an out-of-game advantage to prove a role or sway a vote.

### 8.4 Team loss (ППК: the offender's team loses, and the game ends at once) [F-RU 6.8]
1. Oaths or bets used to prove a role or influence the game.
2. Blackmail, threats or bribery.
3. Prompts from the audience.
4. A Sheriff who has revealed himself proving his role with unique night information.
5. Committing 8.3 #4, #7, #8, #13, #14 or #16 after one's kill has been announced, or after being voted out.

**App:** the host needs "Foul", "Remove (disqualify)", and "Award loss to team" actions. Reason pickers are optional; the game logic depends only on the type.

## 9. Ending the game

| ID | Rule |
|---|---|
| W-1 | **Red wins** when no black players are left in the game [F-RU 1.4]. |
| W-2 | **Black wins** when the number of black players in the game is **at least** the number of red players (`black ≥ red`) [F-RU 1.4]. |
| W-3 | **When to check:** a player leaves at the moment the vote result or night kill is fixed [F-RU 1.4]. Check after every vote result (including a multi-player raise), after every kill (N-3), and after every removal. A win caused by a vote or kill takes effect after the leaving player's last words (L-4). A win caused by a **removal** ends the game **at once** [F-C game-over]. |
| W-4 | **Draw** [F-RU 7.7]: three game nights in a row pass and the number of players in the game doesn't change. **App rule** (per [RFM 4.7.1] and [ASIA 4.4.20]): count only shooting nights. The draw is declared at the morning after **3 consecutive misses** when nobody left the game in between (no vote-out, no raise, no removal). Any departure resets the counter. |
| W-5 | **Team loss** (§8.4): the opposite team wins at once. |
| W-6 | There is no special rule for 3 players left. At 3 players (2 red + 1 black, the "угадайка") the normal vote applies. A 1-1-1 tie that repeats can't go to a raise vote (raising all 3 = all players, T-6a), so it goes to night. The black player then kills, and W-2 decides. **"Автокатастрофа" (car crash) is not an ending:** it is the official name for the tie or defence-speech phase ("Перестрелка (автокатастрофа) между игроками № и №") [F-REC; RFM 4.4.13]. |
| W-7 | Variant [POL]: parity is described as "equal numbers". Same meaning. |

## 10. Timings

| Phase | FIIM (baseline) | Variants |
|---|---|---|
| Role pick, per player | not specified | ≤10 s [RFM] |
| N0 mafia acquaintance | **60 s** exactly | RFM warns at 10 s left |
| N0 Sheriff shows himself | a gesture (a few seconds) | 20 s to look around with mask off [FIIM 2025 EN] |
| N0 free sitting | **30 s** | 40 s [ASIA], 60 s [RFM] |
| Day speech | **60 s** | — |
| Speech of a 3-foul player at 3–4 players | **30 s** | — |
| 3-foul player's nomination-only slot | not specified (a gesture) | 10 s [RFM] |
| Tie defence speech | **30 s** per candidate | — |
| Vote window per candidate | about **1.5 s** | — |
| Last words (vote or kill) | **60 s** | +20 s "протокол" [RFM] |
| Masks on at nightfall | immediately | 5 s [RFM] |
| Shooting | host calls 1..N, about 1 s each | — |
| Don's check | **10 s** | 15 s [RFM] |
| Sheriff's check | **10 s** | 15 s [RFM] |
| Best move | **20 s** (call "5 секунд" near the end) | — |

## 11. 9-player variant: rules and balance

**Is Night 0 already kill-free in the 10-player standard?** Yes. So "mafia doesn't kill on the first night" changes nothing if "first night" means Night 0.

**Decided: option B below.** "First night" means Night 1, the first night after Day 1.

**Resulting rule for both counts:**
- 10 players: N0 has no kill and no checks. Shooting and checks start on Night 1, after Day 1.
- 9 players: N0 is the same. Night 1 runs the Don's and Sheriff's checks but **skips shooting** (step N-2/N-3; the night is not a miss and doesn't count toward W-4). Shooting starts on Night 2. Seats are 1..9 and all other rules are unchanged (V-3 applies on Day 1, and T-6b applies while 9 are at the table).
- 9 players, best move: B-1 to B-3 apply to the **first shooting night** (Night 2). B-2 becomes "not given if 2+ players left by vote before Night 2".

**Balance concern.** No sport source covers a 9-player game; this analysis is ours. The counter that matters is the red margin `red − black`; black wins when it reaches 0. Each kill lowers it by 1, each red voted out lowers it by 1, and each black voted out raises it by 1.
- 10 players (7v3) start at margin 4. Typical sequence: Day 1 has no vote-out ("нулевой круг"), then the kill on Night 1 brings it to 3. Red can mis-vote once (to 2, then 1 after the next kill) before a vote becomes critical. Sport players call this the town's "right to one error" (право на ошибку) [POL scoring].
- 9 players (6v3) start at margin 3. After the Night 1 kill it is 2. **The first red voted out (on Day 2, at 8 players) loses the game after the following night.** Red has **no right to error**, and **Day 2 is already critical**. Black is heavily favoured.

**Options for the product owner:**
- **A.** 6v3 and only N0 is kill-free. Strongly favours black.
- **B (chosen).** 6v3, and **Night 1 has no shooting either**. The Don's and Sheriff's checks still happen on Night 1, and shooting starts on Night 2. From Day 2 (9 players, margin 3, Sheriff and Don each with 1 check), the position is the same as a standard 10-player game on Day 2 after the first kill. The best move then belongs to the first player killed on Night 2. B-2 changes to "not given if 2+ players left by vote before that night".
- **C.** 7v2 (Don + 1 Mafia). The margin is 5, which gives red two rights to error. This favours red and makes the mafia's agreement trivial.


## 12. Edge cases the app must handle

1. **Opener is out of the game:** the next seat in the game opens. The next day counts from the actual opener (D-3).
2. **The player whose turn it is was killed last night:** they are skipped. Their last words came before the discussion (L-2).
3. **Player with 3 fouls:** show their slot as "silent — nomination only". Also handle the F-4 exceptions (tie speech; 30 s at 3–4 players).
4. **3rd foul during someone else's speech, before the player's own slot this round:** the silence applies to this round (F-3).
5. **Nominating a player who is already nominated, or out of the game:** reject it. The speaker may still nominate someone else (D-7).
6. **No nominee:** no vote; go to night.
7. **Single nominee on Day 1:** no vote. **Single nominee on Day 2+:** auto-eliminate (V-3, V-4).
8. **Non-voters:** the last candidate gets the remainder (V-7). The host may fix counts; the app checks that the total equals the number of players in the game.
9. **Ties:** loop T-1 to T-3. Detect "same set" against "smaller set". Apply the raise-vote bans (T-6) using the count of players in the game at that moment.
10. **Raise vote passes:** several players are eliminated at once. Each gets last words (T-8), and the win check runs on the combined result.
11. **Removal during discussion or voting before the result is fixed:** cancel today's vote (F-7a). Removal after the result is fixed, during last words, or at night: cancel the next day's vote (F-7b). Only one vote is cancelled per window.
12. **Removal of a nominee or tied candidate:** the vote is cancelled anyway. Tie speeches finish per F-8.
13. **Removal at night:** before shooting, the player can't be a target; during shooting, kill and removal can both happen (F-9). A removal during the Don's phase is announced after the Sheriff's phase.
14. **Removal that ends the game** (for example the last black, or parity): end at once, with no last words (W-3).
15. **A disqualification after the deciding vote or kill:** the result stands (F-10).
16. **The Don or Sheriff is out of the game:** still run their night steps with timers (N-b).
17. **One black player left:** their shot alone decides. **No shot:** a miss.
18. **Shot at an eliminated seat:** no kill, which in practice is a miss.
19. **Black shoots one of their own:** a valid kill. Run the win check; red wins if it was the last black.
20. **Night 1 miss:** no best move for the rest of the game (B-3). **2+ players voted out on Day 1:** no best move (B-2).
21. **Best move given partially, or interrupted by talk:** record only the numbers already named (B-5).
22. **Kill that gives black parity:** the victim still gets the best move (if eligible) and last words, then the game ends (L-4, W-3).
23. **Draw counter:** 3 consecutive misses with no departures in between means a draw (W-4).
24. **Team loss (ППК):** end at once with the opposite team winning.
25. **Host error:** the app needs **undo**. This is not a rule, but hosts often enter a nomination, foul or vote count wrongly. Use an event log with undo of the last event.

## 13. State machine sketch

### States
```
SETUP            choose N∈{9,10}, enter names (optional), seat numbers 1..N
DEAL(i)          seat i picks a card from those not yet taken; i=1..N; → NIGHT0_MAFIA
NIGHT0_MAFIA     60s timer; → NIGHT0_SHERIFF
NIGHT0_SHERIFF   short; → NIGHT0_FREE
NIGHT0_FREE      30s; → MORNING(day=1)
MORNING(d)       announce kill/miss; if draw condition → GAME_OVER(draw)
                 if killed player K → LAST_WORDS(K) → (win pending? GAME_OVER) → DAY_SPEECH
DAY_SPEECH(seat) 60s (or 0/30s per fouls); host may: accept nomination, foul, remove
                 next seat in the game; after last speaker → VOTE_GATE
VOTE_GATE        if vote cancelled(d) or no nominees or (d==1 && nominees==1) → NIGHT_START
                 if d≥2 && nominees==1 → ELIMINATE([that one])
                 else → VOTE(round=main, candidates)
VOTE(round,cands)host enters counts in order; last = remainder
                 single max → ELIMINATE([max])
                 tie → TIE_SPEECH(tied, i)
TIE_SPEECH       30s each in nomination order → VOTE(round=revote, tied)
                 if revote tie == same set → RAISE_GATE ; smaller set → TIE_SPEECH(new set)
RAISE_GATE       if banned (all in game, or 3-of-9) → NIGHT_START
                 else RAISE_VOTE: yes > alive/2 → ELIMINATE(all tied) else → NIGHT_START
ELIMINATE(list)  mark voted_out; run win check (record pending result)
                 → LAST_WORDS(each, 60s) → pending win? GAME_OVER : NIGHT_START
NIGHT_START      "ночь"
NIGHT_SHOOT      skipped on Night 1 with 9 players (§11)
                 record each black-in-game's target → resolve kill|miss; win check (pending)
NIGHT_DON        10s; record target + yes/no (run even if Don is out of the game)
NIGHT_SHERIFF    10s; record target + red/black (run even if Sheriff is out of the game)
NIGHT_BEST_MOVE  only if kill && first shooting night && eligible; 20s; record 3 numbers
                 → MORNING(d+1)
GAME_OVER        winner ∈ {red, black, draw}; reveal all roles; summary
```

### Interrupts, allowed in any non-terminal state
- `FOUL(p)`: count+1. At 3, set the silence flag and the target day (F-3). At 4, `REMOVE(p, "4th foul")`.
- `REMOVE(p, reason)`: status = removed, no last words. Apply F-7 vote cancellation (today's or the next day's vote). Run the win check and **end the game at once** if it decides the game. Exceptions: during a night step, defer the announcement (F-9); after a decided result, record the removal only (F-10).
- `TEAM_LOSS(team)`: GAME_OVER with the other team winning.
- `TECH_PAUSE`: pause all timers. Night-behaviour rules apply [F-RU 4.6.2].
- `UNDO`: revert the last event.

### Per-player record
| Field | Type / notes |
|---|---|
| `seat` | 1..N, never changes |
| `name` | optional nickname |
| `role` | citizen, sheriff, mafia, don |
| `team` | derived: red or black |
| `status` | alive, killed(night#), voted_out(day#), removed(phase, reason) |
| `fouls` | 0..4, plus a log of (time, phase, reason) |
| `silencePending` | the day whose speech is lost, or null; cleared once served |
| `nominations` | day# → seat nominated (at most one per day) |
| `votes` | not recorded in v1: the host enters counts per candidate (decision Q7) |
| `lastWordsGiven` | bool |
| `bestMove` | [up to 3 seats] or null (only the first-killed player) |

### Per-game record
| Field | Notes |
|---|---|
| `playerCount` | 9 or 10 (9 implies no shooting on Night 1, §11) |
| `day`, `night` | counters |
| `openerByDay` | day# → seat (D-3) |
| `nominationsByDay` | day# → ordered list of (nominee, nominator) |
| `voteRounds` | day# → list of {type: main, revote or raise; candidates; counts; result} |
| `voteCancelledForDay` | set of day# (F-7) |
| `voteResultFixed` | bool for the current day (§4.3) |
| `shotsByNight` | night# → {blackSeat → target, none, or multiple}; `killByNight` night# → seat or miss |
| `donChecks`, `sheriffChecks` | night# → {target, result} |
| `bestMoveEligible` | derived (B-1 to B-3) |
| `consecutiveMisses` | for W-4 |
| `outcome` | red, black or draw; reason (elimination, parity, draw, team loss); the ending event |
| `eventLog` | append-only list of every action, for undo and the summary |

## 14. Product decisions (2026-10-28)

- **Q1. 9-player balance (§11):** option B. No shooting on Night 1; checks still happen.
- **Q2. Night 0 Sheriff step:** FIIM 2026 version (gesture, mask on).
- **Q3. Raise-vote limits:** FIIM T-6 only (ban "all players in the game" and "3 of 9").
- **Q4. Timers:** FIIM values (10 s checks, 30 s free sitting), configurable in settings.
- **Q5. Self-nomination:** allowed.
- **Q6. Last words for a 3-foul player with a pending silence who is killed or voted out:** the full 60 s. F-3 is about the discussion speech; only removal takes away last words.
- **Q7. Votes:** record counts only in v1.

## Sources

- **[F-RU]** FIIM, *Официальные правила игры «Мафия»*, edition of 2026-02-01: https://docs.google.com/document/d/1D1GgNHUNLCoMUeNki_cgNYIphCErAi6dlYjGSV8D_eA. Linked from the documents block on https://fiim.world (Mafia World Tour).
- **[F-EN]** FIIM, *Official Mafia Game Rules* (English), edition of 2025-01-01: https://docs.google.com/document/d/1w3jPGkFW9BmHrizlm9vZFp-3qz-WX_zvab9k3t82K9c. It is older than [F-RU]; differences are noted above.
- **[F-C]** FIIM Referee Committee, official commentary: https://teletype.in/@skfiim/+rules-comments. Posts cited: `vote-cancel`, `night-disqual`, `last-nomination`, `all-out`, `game-over`, `lh-rules`, `hand-play-etc`, `penalty` (all at https://teletype.in/@skfiim/<slug>).
- **[F-REC]** FIIM, *Рекомендации для судей и речевые команды*: https://docs.google.com/document/d/1fjcpbbNK-E2hqmbUPaCVeYqxUQsVKuWzUh8D5vkj6CQ/
- **[F-PROT]** FIIM, *Регламент работы с протоколом игры*: https://docs.google.com/document/d/1pXqwC6WreSCd7_rLwJYFqkNA8nLl7W-TRUM0tUxSShI/
- **[RFM]** Russian Federation of Mafia, *Официальные правила интеллектуально-спортивной игры «Мафия»* (regulations, January 2026): https://disk.yandex.ru/i/clvwEyVEgW4CVQ (via https://teletype.in/@maffederation/docs_sk).
- **[ASIA]** Asia League, *Официальные правила игры «Мафия»*, edition of 2026-07-18: https://docs.google.com/document/d/1U_KHXoMYQAFI4bX-0shxU5FYPcl9FYIdbdnDTHMeeEU
- **[POL]** Polemica, rules and scoring (online platform): https://polemicagame.com/rules
