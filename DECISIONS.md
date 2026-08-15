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

## Known gaps

- **No persistence.** State resets on reload, per the agreed scope. One
  `zustand/middleware` `persist` wrapper away if you want it.
- **No backend**: no auth, no real product lookup, no real QR encoding (the QR
  is a placeholder block), no real friend graph.
- **Only Ava has a browsable friend list** — the other three friends have no
  fixture list, so their rows have no "Their list" link.
- **The gifter page reads your own live data.** Opening `/g/maya` shows Maya's
  real (non-secret) items, which is right for the in-app preview and for a demo,
  but a real deployment serves this from the server for the owner named in the URL.
- **Not run on a physical device.** Verified by typecheck, a clean Expo web
  export, and a scripted click-through of every flow at 393×852 with no console
  errors. Camera, barcode and dictation are wired to the real APIs but have only
  been exercised through their no-hardware fallbacks — they need a device pass.
- **The repo has no git remote configured,** so the work is committed locally
  but could not be pushed. Add a remote and `git push -u origin melikee-app`.

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
