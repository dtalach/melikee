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

- **read** sends a photo or screenshot (1280px JPEG) to Claude's vision, which
  reads the brand, model number and colour into a name and a search query. A
  fast model reads first (`MELIKEE_READ_MODEL`, default `claude-haiku-5-5`); a
  photo it isn't sure about, or can't read, goes to the main model.
- **find** has Claude search the web (and fetch the page, for a pasted link)
  for current listings: name, price, store, buy link, product photo, other
  stores, plus up to two near matches.

**Photos and colours.** Search results rarely include a picture, so the app shows
your own shot first and asks `/api/match` (`mode: image`, `server/image.ts`) for
a store photo in the background: the store pages' share image, else a search
whose result pages are read the same way. The colour read from your photo picks
the listing. When the search sees the product's options, the found sheet offers
one row of them, labelled by kind ("Color", "Storage", "Scent"); colours swap the
photo, the rest just record the choice. The pick is saved in "Size / color", and
clothing sizes are typed there (search results rarely list sizes reliably).

**Speed.** A photo capture shows the product as soon as it's read (about 1–2
seconds) and fills in stores and prices when the search lands. "Want it" works
straight away: the shiny is saved as "finding stores…" and filled in later (or
left "saved for later" and searched again more thoroughly if nothing turns up).
Searches and photo lookups are cached in the database for a day (`server/cache.ts`),
so a product someone already looked up comes back instantly.

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
with a texted code via Twilio Verify (4–10 digits, whatever the Verify service's
Code Length is set to; the app asks) (`api/auth.ts`, `server/auth.ts`):

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

## Friends

Friends are real accounts on the server (`api/friends.ts` → `server/friends.ts`;
the wire contract is `src/lib/friendsContract.ts`):

- **Find:** Friends → Find your people searches by **@handle** (starts-with,
  two characters or more) or by a **whole US/Canadian phone number**. Numbers
  are matched by their HMAC, never stored or shown. "Let people find me by my
  number" (Settings → Privacy defaults) is on by default.
- **Requests:** send, accept, decline, cancel. Asking someone who already asked
  you makes you friends. 40 requests per day per account; 120 searches an hour.
- **What friends see:** every list set to Friends or Friends + link, minus any
  you switch off for that friend (Friends → ⋯ → Can see). Friends lists are
  published with the page but never open from a link; only accepted friends get
  them.
- **Feed and dibs:** friends' shinies from the last 60 days fill the Feed;
  their birthday lists get the birthday card. Calling dibs in the app shares
  one claim per shiny with gifters on links, and the wisher never sees it.
- **Remove / block:** remove ends it on both sides; block also hides you from
  each other's search and drops pending requests.
- **Notifications:** a new request, an accepted request, and a friend's
  birthday in the next 14 days. The app syncs on open, every minute, and when it
  comes back to the foreground (no push notifications yet).

Storage (Redis): `acct:<phoneKey>` gains `uid`, `handle`, `name`,
`findByPhone`; `uid:<uid>` maps back to the account; `handles` (sorted set) and
`huid:<handle>` power search; `fr:<uid>` is a hash of that account's side of
each relationship.

## Ideas (gift inspiration)

The Ideas tab is a scroll of specific products picked for this person
(`src/screens/Ideas.tsx`, `src/lib/ideas.ts` → `POST /api/ideas` →
`server/ideas.ts`).

- **Signals, all first-party:** what's on their lists (starred first), sizes,
  an age band (never the birth date), days to their birthday and dated lists
  like Christmas, the month, device language and time zone, what they recently
  typed or said on the capture screen, and how they reacted to earlier ideas
  ("Want it" = liked, ✕ = not for me), plus the budget chip. Never their name,
  handle or phone number, and nothing from other apps or sites (no cross-site
  cookies or tracking: browsers block it, and it isn't appropriate for teens).
- **One Claude call, two steps:** infer 3–5 taste themes from the evidence,
  then suggest specific, currently sold products spread across themes and price
  bands, never repeating what's on their lists, already shown, or turned down,
  each with a short reason tied to their own signal. Age-appropriate rules are
  in the prompt and anything matching their lists is filtered again on the
  server.
- **Fast:** no web search in that call. Photos load in the background through
  the same lookup as captures (cached a week); "Want it" saves to My wants at
  once and finds the real store and price behind the scenes.
- **Limits and caching:** same signals → same ideas for 6 hours. 60 batches a
  day per signed-in device, 20 per connection otherwise.

## Starting content

A new account starts with four empty lists, My wants, Birthday, Christmas
(Dec 25) and Secret stash, and nothing else: the Feed, Friends, Lists and
notifications show the design's empty states until there's real activity.
Birthday and Christmas show a days countdown on Lists and on Me; tapping the
birthday on Me (or Edit profile) changes it. Gifters see your name if you set one
in Edit profile, else your handle. Signing in on a new phone brings back the
birthday the account signed up with.

Accounts made by earlier builds are brought up to date on their next open
(`migrate` in `src/store/useApp.ts`): the prototype's demo cast (Maya and her
friends) is removed (`cleanSample`), "Sweet 16" becomes "Birthday" and a
Christmas list is added (`addDefaultLists`). If the birthday is still the old
placeholder (Oct 14), Me asks "Add your birthday". Anything the person added
stays.

The Feed's "Trending this week" row is a fixed list of ideas (tapping one looks up
its real price). Not built: the iOS share extension, the Instagram/TikTok/Safari
demo shortcuts, and the offline banner.

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
