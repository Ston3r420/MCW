# Marbles Championship Wrestling (MCW)

### *Where every roll counts.*

\---

## What It Is

A public-facing website where Twitch viewers log in and track their marble's wrestling career — automatically generated from live Marbles on Stream race results. Races happen as normal on stream. The site transforms every race result into professional wrestling drama: rivalries, title reigns, hot streaks, jobbers, and weekly event recaps.

\---

## The Elevator Pitch

> "Marbles on Stream, but every marble has a wrestling career. Viewers log in with Twitch, build their wrestler profile, and watch their marble climb the rankings — or spiral into jobber hell. Everything is generated automatically from race data. The site does the storytelling. The streamer just runs the show."

\---

## Core Features

### 1\. Viewer Profiles

Every viewer logs in via **Twitch OAuth** and creates their wrestler:

* **Ring name** (separate from Twitch username)
* **Hometown** (classic wrestling intro energy)
* **Bio / character description**
* **Character creator** — mix-and-match modular art assets (custom hand-drawn by streamer)

### 2\. Career Records

Every marble has a full career history:

* Win / loss record
* Current streak (win or loss)
* Title history
* Rivalry log
* Race-by-race results feed

### 3\. Wrestling Layer (Auto-Generated)

Raw race placement data → wrestling narrative:

|Race Data|Wrestling Meaning|
|-|-|
|1st place|Win|
|Top 3 consistently|Contender status|
|Bottom 3 consistently|Jobber territory|
|Same two names finishing close repeatedly|**Auto-generated Rivalry**|
|5+ win streak|"On a push"|
|5+ loss streak|"Enhancement talent"|
|Most wins overall|**Champion**|
|Biggest climb in a single session|"Surprise push of the night"|

### 4\. Championships

* **MCW World Championship** — most dominant marble overall
* **Hardcore Title** — chaos/momentum based
* **Tag Titles** — faction or duo system (future feature)
* **24/7 Title** — changes hands unpredictably, maximum chaos
* **Meme Belt** — community voted / special circumstances

### 5\. Weekly Event Card

After each stream session, the site auto-compiles a "show recap":

* Main event result
* Title changes
* New rivalries detected
* Hot streaks and losing streaks called out
* "Moment of the night" highlight

### 6\. Factions (Phase 2)

Viewers can form stables — groups with a shared name, tag, and rivalry history.

### 7\. Promo System (Phase 2)

Viewers can post a short in-character promo on their profile page — trash talk, challenges, alliance announcements.

\---

## Visual Identity

**Style:** Chaotic meme energy — dark background, bold typography, loud and self-aware. Feels like a real wrestling promotion that knows it's about marbles and leans in.

**Primary color:** Teal  
**Theme:** Dark backgrounds, high contrast, teal accents  
**Typography:** Bold, caps-heavy display font for titles and events. Clean readable font for stats and profiles.  
**Art:** Custom hand-drawn modular character assets by the streamer. Wrestlers are built from parts (heads, bodies, gear, accessories). Portraits are the centerpiece of every profile card.

\---

## Technical Architecture

```
Marbles on Stream (streamer's PC)
        ↓  writes local result files
Watcher Script (runs on PC during stream)
        ↓  parses results, strips alt accounts
        ↓  pushes data to →
Cloud Backend (server + database)
        ↓
Public Website (MCW)
  ├── Viewer login (Twitch OAuth)
  │     └── Wrestler profile + career page
  ├── Public leaderboard
  ├── Weekly event card
  └── Admin panel (streamer only)
        ├── Alt account blocklist
        ├── Result overrides
        └── Belt / title management
```

### Key Technical Notes

* **Watcher script** runs locally on the streaming PC. Reads the same local files that Marbles on Stream generates (AppData/Local/MarblesOnStream/Saved/SaveGames/Sessions/). Pushes results to the cloud after each race.
* **No dependency on MyStats** or any third-party tool. Fully independent.
* **Alt account blocklist** — a simple editable list of Twitch usernames to silently ignore when parsing results.
* **Backend** — lightweight server + database (PostgreSQL or SQLite to start). Stores race history, profiles, title records, rivalry data.
* **Twitch OAuth** — viewers log in with their existing Twitch account. No passwords, no separate signup.

\---

## Build Order

Build in this sequence — each phase is usable on its own before moving to the next.

**Phase 1 — Foundation**

1. Cloud backend + database setup
2. Twitch OAuth login
3. Watcher script (PC-side file reader + data pusher)
4. Basic race result storage

**Phase 2 — Wrestling Layer**
5. Win/loss calculation engine
6. Streak detection
7. Auto-rivalry detection
8. Championship logic
9. Weekly event card generator

**Phase 3 — The Site**
10. Public leaderboard + rankings page
11. Individual wrestler career page
12. Weekly event recap page
13. Viewer profile builder (ring name, hometown, bio)

**Phase 4 — Character Creator**
14. Modular art asset system
15. Character creator UI (mix-and-match parts)
16. Wrestler portrait display on profile cards

**Phase 5 — Admin Panel**
17. Streamer login (separate from viewer OAuth)
18. Alt blocklist editor
19. Result void / override tool
20. Manual belt assignment

**Phase 6 — Chaos Features**
21. Factions / stables system
22. Promo wall
23. 24/7 title logic
24. OBS browser source overlay (live title / streak display)

\---

## What Makes It Work

The site doesn't just track stats — it **creates lore**. Viewers come back because:

* *"I wanna see if my marble finally wins the belt."*
* *"GoldRush and CrimsonRoll have finished 1-2 seven times in a row — the site auto-detected a rivalry."*
* *"SilverSlam is on a 12-race losing streak. The site literally called them 'enhancement talent'."*

The streamer just runs races. The site does the storytelling automatically.

\---

## Open Questions (Decide Later)

* Hosting provider (Railway, Render, VPS — figure out when ready to build)
* Promotion name on the site vs. streamer's channel name — same or separate brand?
* Whether viewers can challenge each other to "matches" (would require extra UI)
* Faction creation — streamer-approved or viewer self-serve?

\---

*Document version 1.0 — concept phase*  

