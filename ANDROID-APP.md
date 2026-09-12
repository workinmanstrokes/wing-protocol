# Getting Wing Protocol on your Android home screen

Good news: this project already has full installable-app support built in (it comes from the platform this was built with) — a manifest, a real app icon, and all the right meta tags. It just needs to be deployed somewhere live over HTTPS for that to switch on; opening the raw files from disk doesn't trigger it.

I can't deploy it for you from this session (no access to your Vercel/hosting account), but this is a two-step, few-minutes job:

## 1. Push this project to GitHub

```
git remote add origin https://github.com/Diddlerrr/wing-protocol.git
git branch -M main
git push -u origin main
```
(Create the `wing-protocol` repo on github.com first if it doesn't exist yet.)

## 2. Deploy it — Vercel is the easiest fit

This project is pre-configured for Vercel (that's what its build is set up to target):

1. Go to vercel.com, sign in, **Add New → Project**, and import the `wing-protocol` GitHub repo.
2. Leave the default settings and click **Deploy**. No environment variables are required — auth and the database are already switched off for this build.
3. Once it's live, open the Vercel URL on your Android phone in Chrome.
4. Chrome will offer **Install app** / **Add to Home screen** (or find it in the ⋮ menu). Tap it.
5. Wing Protocol now has its own icon on your home screen and opens full-screen like a native app.

## Why not GitHub Pages / a plain static host?

This project is a TanStack Start app (server-rendered), not a flat static site, so it needs an actual host that runs Node — GitHub Pages can't serve it. Vercel is a free, zero-config fit since the project already targets it.

## Alternative: a real .apk

If you'd rather have an actual installable `.apk` file instead of a PWA, that requires the Android SDK/Gradle toolchain, which isn't reachable from this cloud session (Google's servers are blocked here) and your linked PC can't be reached right now either. Once either becomes available, this project can be wrapped with Capacitor to produce a real signed APK — just ask.
