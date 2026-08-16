# MeLikee

A teen-first wishlist app. Snap, scan or say anything you want; MeLikee finds
the product and files it away. Friends see your lists in a feed and can call
dibs on gifts — secretly, so surprises stay surprises. Anyone without the app
opens a plain branded link and can claim a gift from there.

Built from the Claude Design handoff in `../project`, whose full decision
history lives in `../chats`. Every judgement call made during the build is
logged in `../DECISIONS.md`.

## Running it

```bash
npm install
npx expo start            # then press i / a, or scan the QR with Expo Go
npx expo start --web      # runs in a browser (no camera in most setups)
```

Camera, barcode scanning and dictation need a real device. Everything degrades
gracefully without them: the viewfinder falls back to the app's glow ground and
the capture ritual still runs.

```bash
npx tsc --noEmit          # typecheck
npx expo export --platform web   # static web build into dist/
```

## What's real and what isn't

**Real:** the camera preview, barcode scanning (`expo-camera`), speech-to-text
(`expo-speech-recognition`), clipboard, share intents, and all app state and
navigation.

**Stubbed:** product recognition. There's no product API yet, so
`src/services/productMatch.ts` returns scripted results after a short delay.
Every match in the app goes through that one module, so swapping in a real
lookup service is a change to that file alone.

**Not built:** any backend — no auth, no server, no persistence. State lives in
memory and resets on reload.

## Layout

```
src/
  app/                  expo-router routes
    _layout.tsx         providers + the global overlays (filing tray, sheets, toast)
    index.tsx           the shell: five destinations on a swipeable strip
    list/[id].tsx       a list, as a shelf
    item/[id].tsx       one shiny, in focus
    friend/[id].tsx     a friend's list, from the gifter's side
    g/[handle].tsx      the public gifter page — melikee.app/maya
  components/           dock, filing tray, toast, bottom sheets
  screens/              camera, feed, lists, friends, me (+ camera sub-parts)
  store/                app state and the capture state machine (zustand)
  services/             product matching, the dock↔camera shutter bridge
  theme/                design tokens and the theme provider
  ui/                   icons, primitives, motion vocabulary
  data/seed.ts          all fake content, in one place
```

## The design, in short

- **Camera-first.** The app opens shooting. The shutter lives in the centre of
  the floating dock, so capture is one tap from every screen.
- **The ritual is the reward.** Snap → "Working our magic…" → the found card
  pops → "Want it!" sends it flying into the shutter with a sparkle burst.
  Motion always travels toward the dock.
- **Add first, file second.** The add is never gated. A tray slides up
  afterwards offering undo, a move, or secrecy, then slides away on its own.
- **Never lose a wish.** A wrong match offers three near matches with their
  reasons; none of them offers "save my photo, keep matching".
- **Dibs are secret.** The wisher never learns what's claimed. That promise is
  stated on their own profile, and on every gifter surface.
- **Language:** the brand is MeLikee ("me likee, me wantee"), the objects are
  *shinies*, and the claim verb — gifter side only — is *dibs*.

## First run and persistence

The app opens on onboarding: a welcome, a name, a birthday, and the camera
permission. The name becomes the handle and the public link, shown as you type.
The birthday is skippable — the camera pill turns into *"Add your birthday"* and
the Me card is the way back to it.

What onboarding creates is a real, empty account: two starter lists, no shinies,
no friends, no feed, nobody asking to follow you.

**The demo account is still there**, offered by name on the welcome screen
(*"Just show me a demo account"*) — the seed content is what makes the Feed,
Friends and gifter screens worth looking at. Settings tells you which one you are
in, and takes you back through the door either way.

Everything a user makes is written to device storage and survives a reload. Only
what they made: lists, shinies, friends, access, dibs, notes, profile and
preferences. Not the tab they were on or the sheet they had open.

## Real product lookup

Photo, barcode and voice all resolve to real products through `api/recognize.ts`
— a serverless function that runs two Claude passes:

1. **Read the photo.** Opus 5 vision extracts brand, product name, model
   number, category, colour, variant and every legible string into a fixed
   schema. Barcode scans and spoken wants skip this — they are already queries.
2. **Find where to buy it.** A second Opus 5 call with Claude's server-side web
   search tool turns that into current listings: store, price, link, and up to
   three other retailers with their own prices.

The endpoint exists for exactly one reason: **the API key must never ship inside
the app.** Anything in the bundle is readable by anyone who installs it.

### Switching it on

Set one environment variable on the deployment:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Optionally `MELIKEE_VISION_MODEL` / `MELIKEE_SEARCH_MODEL` to trade cost for
quality (both default to `claude-opus-5`).

For a device build, the app also needs to know where the endpoint lives, since
a phone has no origin to be relative to:

```
EXPO_PUBLIC_MELIKEE_API=https://your-app.vercel.app
```

The web build needs nothing — it calls `/api/recognize` on its own origin.

### Checking it

```bash
node scripts/try-recognize.mjs --url https://your-app.vercel.app
# → {"ok":true,"service":"melikee-recognize","configured":true}

node scripts/try-recognize.mjs --url https://your-app.vercel.app --scan 027242925175
node scripts/try-recognize.mjs --url https://your-app.vercel.app --snap ./photo.jpg
```

`configured: false` means the function is deployed but has no key.

### Without it

With no key, no deployment, or no camera, the app falls back to a small scripted
catalogue so the whole ritual still runs — and says so: the found card's
freshness line reads *"demo match · not a live price"*. A real search that finds
nothing is different, and gets an honest miss screen with a way to retry or keep
the photo.

## Verifying it

`scripts/verify-flows.mjs` drives the built web app in a headless browser and
screenshots every flow — the capture ritual, the filing tray, both dibs
surfaces, every sheet, and light mode. It exits non-zero on any console error,
which is how the render loop and the pager accessibility bug were caught.

```bash
npm install --no-save playwright && npx playwright install chromium
npx expo export --platform web
npx http-server dist -p 8099 -s &
node scripts/verify-flows.mjs        # writes to .verify-screens/

# to refresh the checked-in set under docs/screens instead:
OUT=docs/screens node scripts/verify-flows.mjs
```

The screenshots it produced on the last run are checked in under
`docs/screens/`, so you can see every screen without building anything.
