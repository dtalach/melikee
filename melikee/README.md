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

## Shared lists

Your Friends + link lists are published to the server whenever they change
(`src/components/usePublisher.ts` → `PUT /api/pages`), so links open on any
phone:

- `melikee.app/<handle>` opens My wants if it's shared, else your first
  Friends + link list. `melikee.app/<handle>/<list>?t=<token>` opens one list.
- Private and Friends-only lists are never sent. Friends-only sharing needs
  friend accounts, which don't exist yet.
- "Reset link", the link-expiry setting, and making a list private take effect
  on the server: old links show "expired".
- Gifters call dibs through `POST /api/dibs`. One claim per shiny (atomic);
  other gifters see "{name} has it"; only the gifter who called it can undo it.
  The owner's app never reads dibs, and opening your own link on your own
  device shows the local preview.
- The first device to publish a handle owns it (it holds a secret the server
  checks). If your handle is taken, Me and the share sheet say so and offer
  "Change handle".

Storage is Upstash Redis via the Vercel Marketplace (`server/pages.ts`):
`page:<handle>` holds the published lists, `dibs:<handle>:<list>` the claims.
**Setup:** add Upstash for Redis to the Vercel project; it sets
`KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without them, links show
"Sharing isn't switched on". For local testing, `MELIKEE_STORE=memory` uses an
in-memory store.

**Not yet:** accounts (the handle secret lives on one device, so a new phone
starts a new page), "Something's coming" notifications, and the Friends tab's
list of who holds your link (still sample data).

## Sign-in and age

MeLikee is **13+ only**. An under-13 birthday at sign-up shows "MeLikee is for
13 and up", the device stays blocked, and the server also refuses to create an
account for anyone under 13. The parent step is optional, and only shown to
13–17-year-olds.

Every account is a **verified phone number** (US and Canada for now), signed in
with a texted 6-digit code via Twilio Verify (`api/auth.ts`, `server/auth.ts`):

- Only phone-verified devices can publish a page.
- "I already have an account" → number → code restores your handle and shared
  lists on a new phone, and signs the old phone out.
- Numbers are never stored: the database keeps an HMAC of the number keyed with
  `MELIKEE_PHONE_PEPPER` (never change it, or existing accounts stop matching);
  the device keeps only the last two digits.
- Limits: 3 codes per number per 10 minutes and 10 per day, 10 codes per
  connection per hour, 10 wrong guesses per number per hour.

**Setup:** in Vercel, set `TWILIO_VERIFY_SERVICE_SID` plus either a Twilio API
key (`TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`, preferred) or the account's
`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`. For local testing, `MELIKEE_SMS=fake` accepts the
code `000000` and sends nothing.

**Not yet:** private and Friends-only lists don't move to a new phone (only
shared ones do).

## What's still sample data

Friends, the Feed, notifications other than "We think we found it", the
Friends tab's link holders, and the six starter shinies (`src/store/seed.ts`). There's no
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
