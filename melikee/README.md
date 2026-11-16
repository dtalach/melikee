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

## Product matching

Every capture is matched for real by `POST /api/match` (`api/match.ts` →
`server/match.ts`), a Vercel function that calls Claude so the API key never
ships in the app:

- **read** sends a photo or screenshot to Claude's vision, which reads the brand,
  model number and colour into a name and a search query (a few seconds).
- **find** has Claude search the web (and fetch the page, for a pasted link)
  for current listings: name, price, store, buy link, product photo, other
  stores, plus up to two near matches.

Snap, Scan (barcodes), Say (speech-to-text, then search), the photo library,
pasted links, typed searches and trending all go through it. "Save photo, keep
matching" runs a slower, more thorough search in the background and raises
"We think we found it" if it lands.

**Setup:** set `ANTHROPIC_API_KEY` in the Vercel project's environment
variables (Production and Preview). `GET /api/match` reports
`{ "configured": true }` once it's there. `MELIKEE_MODEL` overrides the model
(default `claude-opus-5-5`).

The web app calls its own `/api/match`. Native builds, and `expo start --web` on
localhost, call the production deployment; point them elsewhere with
`EXPO_PUBLIC_API_URL`.

**Not yet:** prices aren't re-checked after a shiny is saved (so there's no
real price history or price-drop alerts), the endpoint has no rate limiting or
auth, and anyone who finds the URL can spend API credit.

## Public links

The app hands out `melikee.app/<handle>` (your page) and
`melikee.app/<handle>/<list>?t=<token>` (one list). Only Friends + link lists
open from a link; "Reset link" changes the token, so old copies stop working.
There's no shared backend yet, so these pages show a list only on the device
that owns it: someone else opening your link sees "expired" until lists are
stored on a server.

## What's still sample data

Friends, the Feed, notifications other than "We think we found it", other
gifters' dibs, and the six starter shinies (`src/store/seed.ts`). There's no
backend for accounts, sync or sharing. Not built: the iOS share extension, the
Instagram/TikTok/Safari demo shortcuts, and the offline banner.

## Layout

```
api/match.ts           the Vercel function (thin: validation + routing)
server/match.ts        Claude calls for read and find; never bundled into the app
src/
  app/                 expo-router routes
    _layout.tsx        fonts, splash, store hydration
    index.tsx          the app shell
    [handle]/          public links: melikee.app/<handle> and /<handle>/<list>?t=<token>
    g/[handle].tsx     the older link form, kept so copied links still open
  components/          Shell (screen switch), Dock, FilingTray, Toast, sheets/
  screens/             one file per screen in the prototype
  store/               zustand store, types, seed data
  lib/                 dates (countdowns, age), match + photo (calls /api/match)
  theme/tokens.ts      colors and fonts from the prototype's dark "ink" theme
  ui/                  primitives, icons, motion (the prototype's keyframes)
```
