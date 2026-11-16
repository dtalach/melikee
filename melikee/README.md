# MeLikee

A teen-first wishlist app. Snap, scan or say what you want; MeLikee finds the
product and files it on a list. Friends see your shared lists in their Feed
and call dibs on gifts in secret. Family without the app opens a plain link
and calls dibs from there.

Built from the Claude Design handoff in `../project`:
`MeLikee Teen Prototype.dc.html` is the primary design,
`MeLikee Camera Options.dc.html` settles the full-screen camera (option 1b),
and `MeLikee Rules Spec.md` gives the product rules the prototype only shows.

## Running it

```bash
npm install
npx expo start            # press i / a, or scan the QR code with Expo Go
npx expo start --web      # in a browser
```

```bash
npm run check             # typecheck + lint
npm run export            # static web build into dist/
```

## What's real and what isn't

**Real:** all navigation and app state (saved on the device), the camera
preview and barcode reading (`expo-camera`), clipboard links, the share sheet,
haptics, and every rule in the spec that doesn't need a server: sharing levels
and what they reveal, link reset/expiry, dibs secrecy, countdowns from today's
date, the under-13 parent requirement, handle rules, the post-birthday sort,
duplicate detection and pending shinies.

**Stubbed:**
- **Product matching.** No product API yet. Every capture path goes through
  `src/lib/match.ts`, which returns scripted results; swapping in a real
  lookup is a change to that file.
- **Say** shows the listening state and matches a sample phrase; there's no
  speech-to-text.
- **Screenshot** (the camera-roll tile) runs the screenshot-matching flow
  without opening the photo library.
- **Friends, the Feed, notifications and other gifters' dibs** are sample data
  (`src/store/seed.ts`). There's no backend, auth or sync.

**Not built:** the iOS share extension and the Instagram/TikTok/Safari demo
shortcuts (they need a native extension target), and the offline banner.

## Layout

```
src/
  app/                 expo-router routes
    _layout.tsx        fonts, splash, store hydration
    index.tsx          the app shell
    g/[handle].tsx     the public gifter page (?l=<list>&t=<link token>)
  components/          Shell (screen switch), Dock, FilingTray, Toast, sheets/
  screens/             one file per screen in the prototype
  store/               zustand store, types, seed data
  lib/                 dates (countdowns, age), match (stubbed matching)
  theme/tokens.ts      colors and fonts from the prototype's dark "ink" theme
  ui/                  primitives, icons, motion (the prototype's keyframes)
```
