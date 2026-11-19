# Wing Protocol — Blind playtest log

VEX retest (2.5/10, grade F): "Right now this is a live build with no
describable game in it — you have a deployment, not a playable loop to
review." The fix for that verdict is evidence, not more content: **no
further content is added until five blind playtests pass** (VEX item 1).

## Deploy gate — run before ANY playtest session

The GitHub Pages test site returned GitHub's 404 page when checked live on
2026-11-19, so the retest could not have seen the current build at that
URL. Before handing a build to any tester:

1. Repo **Settings → Pages → Build and deployment → Source**: GitHub Actions.
2. **Actions → Deploy PWA to GitHub Pages → Run workflow** (see
   `ANDROID-APP.md`).
3. Open `https://workinmanstrokes.github.io/wing-protocol/` on a phone and
   confirm the game loads (not a 404) and the Play tab shows the core loop
   ("First Sortie — the 60-second core loop") next to the First Sortie mode.
4. Only then start a session. Record the deployed commit below.

If the URL 404s, stop: the session would test nothing, and its feedback
would be about a stale or missing build.

## Protocol (same for all five sessions)

- **Blind:** the tester gets the link and nothing else — no explanation of
  the goal, controls, or modes, no prompting during play.
- **Device:** a real phone (or real browser on a phone-sized screen). Record
  the exact phone model and browser.
- **Log, per session:** did the game load, and how long did it take? Did the
  tester find and start First Sortie without help? Could they state the goal
  in their own words afterwards ("survive 60 seconds until extraction")?
  Could they move, and did they understand the guns fire on their own? Did
  they find and use a wingman command (Focus / Spread / Regroup) in the
  first 30 seconds? Did they hear music and sound effects (note if the phone
  was silent/vibrate)? Did they reach a win or a lose screen, and did Retry
  restart in under 10 seconds? Any update prompt or stale-build confusion?
- **Pass:** at least 4 of 5 testers state the goal unprompted, start a run
  unaided, and reach a win or lose screen. Anything less is a fail — fix the
  onboarding/loop first, then re-run the failed sessions with new testers.

## Sessions

| # | Date | Tester (first name only) | Device + browser | Deployed commit | Goal stated unprompted? | Win/lose reached? | Retry < 10s? | Sound heard? | Notes |
|---|------|--------------------------|------------------|-----------------|-------------------------|-------------------|--------------|--------------|-------|
| 1 | NOT RUN | — | — | — | — | — | — | — | — |
| 2 | NOT RUN | — | — | — | — | — | — | — | — |
| 3 | NOT RUN | — | — | — | — | — | — | — | — |
| 4 | NOT RUN | — | — | — | — | — | — | — | — |
| 5 | NOT RUN | — | — | — | — | — | — | — | — |

No session has been run yet. Do not fill a row from memory or from a
non-blind run — a row counts only when the protocol above was followed.
