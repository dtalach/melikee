# Decisions log — MeLikee build

Every judgement call made while turning the Claude Design handoff into a real
app, with the reasoning. Written for review; nothing here is load-bearing, so
say the word and any of it can go the other way.

---

## Answered up front

Three questions were asked before starting, and answered:

| Question | Answer |
| --- | --- |
| Stack (no existing codebase in the repo) | **Expo + React Native + TypeScript** |
| Scope | **UI + local state, mock data** — no backend |
| Camera / barcode / dictation | **Real**, with product lookup stubbed |

Everything below is a decision that came up *after* that, made without asking.

---

## Architecture

**1. The app lives in `melikee/`, the design bundle stays untouched.**
`README.md`, `chats/` and `project/` are the handoff and are left exactly as
they arrived, so the prototype stays available as reference.

**2. expo-router, not a single stateful screen.**
The prototype was one component with a `screen` string. Real routes buy three
things it didn't have: the Android back button works, `router.back()` returns
you where you came from (which fixes punch-list item #5, "back from item
detail can strand you", structurally rather than by tracking an origin
string), and the gifter page gets a real URL — `/g/maya` — which is the whole
point of a shareable link.

**3. The five destinations are a swipeable pager, detail views are pushed
routes.** Swiping across tabs was a design decision worth keeping, and a pager
also lets the camera stay mounted so its preview doesn't restart every time you
come back. List detail, item detail, a friend's list and the gifter page are
pushed on top.

**4. Swipe order includes Friends.**
The prototype's swipe order was `camera → lists → feed → me`, skipping Friends —
almost certainly because Friends was added to the dock later. Swiping and the
dock now agree: `camera → lists → feed → friends → me`, camera still leftmost,
as the design settled.

**5. Two stores, not one.** `useAppStore` holds content and preferences;
`useCaptureStore` holds the capture state machine. They're separate because two
different components drive the capture — the camera screen owns the viewfinder
and the reveal, the dock's shutter is the thing you actually press.

**6. Recognition sits behind one interface.** Everything the app knows about
matching goes through `services/productMatch.ts`. Swapping the scripted results
for a real product API is a change to that one file.

---

## Deliberate departures from the prototype

**7. Default theme is dark, not system.**
Light mode is built and complete (it was a designer tweak; here it's a real
setting under Me → gear). But the brand's home ground is dark — every glow,
sticker and sparkle is tuned for it — so a light-mode phone doesn't silently
get the secondary look. *Easy to flip to `'system'` if you'd rather.*

**8. The tweaks panel is gone; its contents became product.**
The prototype's tweaks were a design tool. Here: `lightMode` → a real theme
setting; `reduceMotion` → a real accessibility setting; `emptyFeed` /
`emptyFriends` / `emptyLists` → real states that appear when the data is
actually empty (no friends, no items). `filingSeconds` is a constant (6s).

**9. Only the plus shutter icon ships.**
Eleven icon options were explored and **plus** was chosen. The other ten were
exploration, so they aren't in the code.

**10. "+ New list" actually creates a list.**
It was inert in the prototype. Since every list carries a default visibility
(the turn-7 model), creating one asks exactly two things — a name and who can
see it — and nothing more.

**11. The settings gear opens real settings.**
It showed a toast in the prototype. It now holds theme, reduce motion, and
read-only rows for sharing defaults and price-drop alerts. This is also the
only way to reach light mode.

**12. Share targets are wired for real.**
"Text it / WhatsApp / Email" open `sms:`, `whatsapp://` and `mailto:` with the
note and link prefilled, falling back to copying the link if the app isn't
installed. Three buttons that do nothing would have been worse than three that
do the obvious thing.

**13. Copy fixes.** "1 shinies" → "1 shiny". Item provenance read "added
scanned · Jul 20"; the strings are now phrases that work after "added" ("by
scan · Jul 20", "by voice · Jul 12").

**14. Friends gained a "Their list ›" affordance.**
The design review asked for Friends to become the browsing view rather than a
management screen. Ava is the one friend with fixture data, so her row links to
her list; Manage still holds access, remove and block one tap down.

---

## Camera, barcode and dictation

**15. Each mode fires the way its hardware actually behaves.**
- **Snap** — shutter takes a photo, flash plays, then matching runs.
- **Scan** — a detected barcode *is* the capture, no press needed (that's how
  scanners work). Pressing the shutter uses the last barcode seen, or says
  "Line a barcode up in the frame".
- **Say it** — the shutter starts dictation (this is the permission moment the
  review noted was missing), the waveform is driven by real input volume, and
  a final result starts matching automatically.

**16. The flash only plays for a real photo.** The prototype flashed for every
mode. A flash is a camera affordance, not a loading state.

**17. Unknown barcodes still resolve.** A handful of real UPCs from the fixture
data map to the right product. Anything else returns the scripted best match
but keeps the *real* scanned UPC on it, so item detail shows what was actually
scanned rather than inventing one.

**18. No camera is not a dead end.** Simulator, denied permission, or a browser
with no device: the glow ground stands in for the viewfinder, the permission
ask appears in the app's own voice, and the ritual still runs. Losing the wish
would be the worse failure.

**19. Leaving the camera mid-capture abandons it** rather than leaving a stale
reveal waiting when you come back.

---

## Bugs found by driving the built app

These were caught by exporting the web build and clicking through it with a
headless browser — worth recording because two of them would have shipped.

**20. Infinite render loop (React #185) on the list and gifter routes.**
Store selectors that ran `.filter()` returned a new array on every read, so
`useSyncExternalStore` saw a change every render. Fixed by selecting the raw
array and deriving with `useMemo`; the dead selectors that would have
reintroduced it were removed, with a note in the store explaining the rule.

**21. Off-screen pager pages were interactive.** All five pages stay mounted,
and inactive ones were still reachable by screen readers and by the browser
scrolling the strip out from under the app's own state. Inactive pages are now
`pointer-events: none` and hidden from assistive tech.

**22. Pager pages had no height,** so the camera's absolutely-positioned chrome
(greeting, mode selector, permission prompt) collapsed to the top.

**23. The viewfinder brackets were redrawn as four real corners.** The
prototype stretched a 100×100 SVG to a tall frame with
`preserveAspectRatio="none"`, which turns the corner radii into long straight
runs — visible as stray lines in the port.

**24. Glow panels fade into the page ground, not the deep stop,** so there's no
seam where a panel ends (visible under the Me hero).

**25. Top inset has a floor.** Devices and browsers without a status-bar inset
put headers flush against the top edge.

---

## Real product lookup (Claude vision + Claude web search)

**26. The image is *read*, not matched.** The obvious tool for "photo →
product" is a visual similarity index (Google Cloud Vision Product Search,
Rekognition Custom Labels), and it is the wrong one here: those match a photo
against a catalogue of product images you have already indexed, and MeLikee has
no catalogue. Reading wins because almost everything a teenager photographs has
its own name printed on it, and reading generalises to a product that came out
this morning.

**27. Two passes, not one.** Pass one is Opus 5 vision with a structured output
schema — brand, product name, model number, category, colour, variant, every
legible string, a confidence and a search query. Pass two takes that reading and
runs Claude's server-side `web_search_20260209` tool to find listings that
actually exist right now. Splitting them means a barcode scan and a spoken want
skip pass one entirely — a UPC and a sentence are already queries — and it means
the expensive perception step is not repeated when a search needs retrying.

**28. Opus 5 for both, with an env override.** Reading a model number off a box
in bad shop lighting is exactly where the frontier model earns its price, and a
confidently wrong product is the failure the whole app is built to avoid.
`MELIKEE_VISION_MODEL` and `MELIKEE_SEARCH_MODEL` exist so cost can be tuned
without a code change.

**29. Thinking is off for the vision pass, on for the search pass.** Reading a
label is perception, not reasoning — Opus 5 does it better with a bigger image
than with a longer thought. Ranking four real listings against what someone
meant is reasoning, so that pass keeps adaptive thinking.

**30. Photos are downscaled to a 1568px long edge before they leave the phone.**
A 12MP capture is the slowest part of a shop-floor capture and Claude resizes it
away anyway. 1568px still reads a model number.

**31. `skipProcessing` was removed from the capture.** It was there for speed,
but it also skips the orientation fix, and a sideways photo is one the model has
to read sideways.

**32. There is a server, and it exists only to hold the key.** Anything in the
app bundle is readable by anyone who installs it, so `api/recognize.ts` is a
Vercel function that holds `ANTHROPIC_API_KEY` and returns only the answer. The
build was checked for leakage: the web bundle contains no Anthropic SDK.

**33. Failed lookups are a designed screen, not an error.** A scripted matcher
always found something; a real one sometimes looks at a wall. `MissCard` gives
every miss a reason in the app's voice and three ways out — retry the same
lookup, keep the photo and match it later, or go back — because the design
review's rule still holds: losing the wish is the failure that matters.

**34. Demo mode is kept, and says so on its face.** With no endpoint deployed,
no API key, or no camera to photograph with, the scripted catalogue still runs
the whole ritual — but the found card's freshness line reads "demo match · not a
live price" instead of a price age. A demo that silently pretends to be real is
worse than no demo. Everything else — a real search that found nothing, a
timeout, a refusal — is a real answer and the user hears it.

**35. Repeat barcode and voice lookups are cached for 30 minutes** in the warm
function instance. Scanning the same barcode twice in a shop is normal
behaviour and a repeat search costs real money. Photos are not cached: every
photo is a different photo.

**36. The invented store-comparison prices are gone.** Item detail used to
derive two "competitor" prices from the item's own (`base * 1.04`). Harmless
against a scripted matcher; a lie next to a real one. The card now shows the
retailers the search actually found, with their actual prices, and disappears
when only one was found.

**37. Price freshness is computed, not asserted.** "price checked 2h ago" was a
fixed string. Now every match carries the moment it was checked and the whisper
counts up from it — and says "price may have moved" when it has no idea.

---

## Persistence

**38. AsyncStorage, not a database.** This is a few kilobytes of JSON with no
queries over it, and AsyncStorage behaves the same on iOS, Android and web.
Swapping it for SQLite later is a change to one file.

**39. Only what the user made is saved.** The tab they were on, the toast that
was showing, the open sheet and the text in a search box are facts about a
moment, not about them — restoring a sheet somebody closed by quitting the app
would be a small haunting.

**40. Inline photos are dropped on the way to storage.** On a device a photo URI
points at a cache file, which is cheap to keep. On web it is the whole image as
base64, and a handful of those exhaust localStorage's five-megabyte quota and
take every other saved thing down with them. So a web capture keeps its shiny
across a reload and loses its picture, which is the better half to lose.

**41. A photo that no longer resolves falls back to the placeholder.** The OS is
free to sweep the cache directory between launches, and a hole where a picture
was reads as a bug.

**42. The shell waits for storage before its first render.** Reading is
asynchronous, so the first frame holds defaults — showing it would flash the
seed lists at someone who has their own. The gate resolves in a frame or two.

**43. Ids resume above whatever came back.** They are handed out from a counter;
without reseeding it on rehydrate, the next capture would take an id an
existing shiny is already using.

---

## First run

**44. A new account is not Maya.** Opening the app used to hand you her name,
her handle, her public link, her three lists, her six shinies, four friends you
had never met and a stranger asking to follow you. Four screens now stand in
front of that: a welcome, a name, a birthday, and the camera permission.

**45. The name is the only thing onboarding insists on,** because it is also the
handle and the public link — the thing you send people. It is shown as
`melikee.app/<handle>` while they type, so the consequence of the answer is
visible before they commit to it.

**46. The birthday is asked for, and skippable.** The camera screen leads with a
countdown to it and the Feed nudges friends about it, so the app is diminished
without one — but demanding a date before someone has seen anything is how you
lose them at the door. Skipping turns the camera pill into "Add your birthday",
which is the way back in.

**47. Birthdays are stored as a month and a day, and the countdown is computed.**
The seed carried `birthday: 'Oct 14'` *and* `daysToBirthday: 71` side by side.
A countdown written down once is wrong the next morning, and now that state
persists, it would have been wrong for months.

**48. No native date picker.** It opens on today, spins through a year nobody
wants, and asks for a birth year the app has no use for. Twelve month chips and
a grid of days: nothing to type, and 31 February is unreachable.

**49. Camera permission is asked during onboarding, not on the first shutter
press.** Asking at the moment of intent, with the reason on screen, is both
better manners and a better grant rate than ambushing someone mid-ritual.

**50. The demo account is offered outright on the welcome screen.** Showing
someone the whole populated app is a real need — the seed content is what makes
the Feed, Friends and gifter screens worth looking at. So it is a choice you
make on purpose ("Just show me a demo account") rather than the default someone
is silently dropped into, and Settings says which one you are in.

**51. Settings can send you back through the door,** because onboarding was
otherwise one-way and there are two good reasons to return: you are about to
demo the app, or you want your own account back afterwards.

**52. The flattering fake numbers are demo-only.** The Me screen added eight to
the shiny count to make the profile look lived-in, and shipped 23 reactions and
3 dibs. A real new account reads 0, and the taste tags and most-loved-shiny
cards — both of which claim to be inferred from your shinies — hide until there
is something to infer from.

**53. The directory of people to invite is kept for real accounts.** It is
fixture data, but it is *search results*, not "your friends" — without it the
invite sheet is a dead search box. The four seeded friends and the inbound
follow request are not kept, because those are claims about your life.

---

## Known gaps

- **No backend beyond the lookup endpoint**: no auth, no real QR encoding (the
  QR is a placeholder block), no real friend graph.
- **The lookup has not been run against a live API key.** No key was available
  in the build environment, so the endpoint is verified by typecheck against the
  Anthropic SDK's own types and by the app's fallback path, not by a real
  round trip. `scripts/try-recognize.mjs` is there to make that a one-liner.
- **Only Ava has a browsable friend list** — the other three friends have no
  fixture list, so their rows have no "Their list" link.
- **The gifter page reads your own live data.** Opening `/g/maya` shows Maya's
  real (non-secret) items, which is right for the in-app preview and for a demo,
  but a real deployment serves this from the server for the owner named in the URL.
- **Not run on a physical device.** Verified by typecheck, a clean Expo web
  export, and a scripted click-through of every flow at 393×852 with no console
  errors. Camera, barcode and dictation are wired to the real APIs but have only
  been exercised through their no-hardware fallbacks — they need a device pass.
- **Lookup latency is real.** Two Claude passes plus a web search take
  meaningfully longer than the 1.6s the reveal was choreographed for. The wait
  now explains itself after seven seconds, but a capture that takes twenty is
  still a capture that takes twenty.

---

## Things worth a design decision from you

Noted rather than acted on:

1. **Post-occasion behaviour** is still undesigned — a birthday passes and the
   list stays as it was. The design review flagged it ("stale dibs block real
   gifts") and it was deferred.
2. **Un-dibsing on the gifter side works** (tap again), but there's no design for
   an aunt who changes her mind days later on a page she's re-opened.
3. **The Feed subtitle truncates** ("what your peo…") at 393px next to the
   "Find your people" pill, exactly as it did in the prototype. Kept faithful,
   but it could drop the subtitle when the pill is present.
4. **Group gifting, occasion auto-lists and parent-visibility controls** were
   raised in the review as "worth adding eventually" and are not built.
