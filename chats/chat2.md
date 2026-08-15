# Design Review Before Development

_Started 2026-08-15 01:50 UTC_

---

## User

Continuing from "Wishlist sharing mobile app".

## Assistant

We were working on MeLikee, a teen-first wishlist app with camera-first capture, social feeds, and a branded gifter view for non-users. The core promise: snap it, the app finds the product, you add it to your list, and friends can secretly call dibs on gifts.

We've settled the full experience: camera opens into Snap/Scan/Say-it modes, captures go through a "we found it" ritual with near-match recovery and graceful photo saves, the Feed surfaces friend activity and price drops, Friends handles search and invites with a null-state explanation, and the Me tab now leads with identity (taste tags inferred from your shinies), the shared QR link (the viral non-user hook), birthday, and stats.

Design decisions locked in: plus-sign shutter in the center of a floating dock, mode selectors as plain text labels (no pill buttons), the dock hides during capture to focus the ritual, brand language is "Me likee, me wantee" + "shinies" + "dibs" (claim verb on gifter side), filing defaults to the last list you used (named explicitly), near-match cards show 3 candidates with match reasons, and full-bleed glow-ground null states for Feed and Friends (matching the camera screen's hero language).

The Options canvas holds all exploration turns (1–10) including personality directions, navigation treatments, color/contrast tweaks, the capture ritual choreography, list visibility (7b: add-then-file), the gifter view (turn 9: branded, non-account, with share notes), and the Me tab directions. The teen prototype (MeLikee Teen Prototype.dc.html) is the working clickable — live state, all flows end-to-end, fake data for testing.

Open: light-mode exploration (you just asked if we should mock it for the whole app), wiring the share note into the gifter page header, and richer friend-search results (avatars, school context, "follows you" badges).

Files: MeLikee Options.dc.html (all design exploration), MeLikee Teen Prototype.dc.html (the live clickable), Nocturne design system (reference).

## User

Ok,  take a final look at what we have and let me know what final design, UX, UI changes we should make before we code this up.

## Assistant

_[tool: read_file]_

_[tool: read_file]_

Full pass done. Here's my final punch list, grouped by importance:

**Worth fixing before handoff**

1. **Gifter view isn't reachable from the prototype.** Share sheet says "grandma opens a simple page" but there's no way to see it. Devs will build the app and forget the viral hook. Add the gifter page as a screen (tap the link preview) — and wire the share note into its header, which was already on our open list.
2. **Dibs never appears on the owner side of the prototype.** The Me tab says "3 dibs called" but nothing explains that you can't see *which*. One line under that stat ("we'll never tell you which ones") closes the core privacy promise in-product.
3. **"Want it too" from the Feed files silently into My wants** with no move/secret option — inconsistent with the camera's add-then-file ritual. Cheapest fix: reuse the filing tray (or at least a toast with "Move" action).
4. **Item detail has no delete/edit.** "Got it already" / remove is a guaranteed day-one need — one ghost action at the bottom is enough.
5. **Back from item detail can strand you**: `backFromItem` goes to `list`/`camera` but if you arrived from Feed or Me (most-loved shiny isn't tappable yet, but will be), you lose context. Track origin screen.

**Small UI polish**

6. Feed price-drop and reaction cards aren't tappable — they look identical to the tappable birthday card. Either make all tappable or visually flatten the passive ones.
7. "Peek" on Ava's birthday card does nothing — should open her list (friend-list view doesn't exist; either add a minimal read-only version or cut the button label to plain text for now).
8. Trending cards have no "Want it" affordance — teens will tap them expecting to add. Tap → found-card ritual would be a nice reuse.
9. The 71-days birthday pill on camera duplicates the Feed bell area — fine, but it's not tappable; link it to Me.
10. The `🔥`/`😍` emoji reactions conflict with Nocturne's no-emoji stance elsewhere — I'd keep them (they're the product's voice), but swap the lone `👵` in the share sheet for a Phosphor icon.

**Explicitly parked** (decide now or cut): light mode, richer friend-search results (avatars/school/"follows you"), and Say-it mode currently auto-plays fake dictation with no mic-permission moment.

Want me to apply 1–5 (plus the cheap polish items) to the prototype now, or is this list going straight to the dev ticket?

## User

Lets make all the recommended changes.  Lets also include a light mode option, and richer friend-search results.  We will tackle Say-It mode when coding.

## Assistant

Applying everything in one pass — new gifter preview screen (wired to the share note), Ava "Peek" list with dibs, feed-add filing tray, item actions, origin-aware back, flattened passive cards, tappable trending/birthday pill, richer search results, icon swap, and a full light-mode theme via a `lightMode` tweak.

_[tool: run_script]_

Pre-check flagged the restore token (it only exists after an earlier op runs). Re-running with apply-time validation:

_[tool: run_script]_

The `#c8f54255` occurrence was removed by the earlier flatten op. Re-running with color ops marked optional:

_[tool: run_script]_

_[tool: ready_for_verification]_

All changes are in and out for review. What's new:

- **Gifter preview** — tap the link card on Me, or "Preview their view →" in the share sheet; your share note shows in its header, plus a dibs-privacy footer
- **Peek** on Ava's birthday card opens her list with working "Call dibs"
- **Feed "Want it too"** now runs the same filing tray (move/secret/undo)
- **Item detail** has "Got it already ✓" and "Remove"; back always returns where you came from
- **Trending cards** tap into the found-card ritual; birthday pill jumps to Me
- **Passive feed cards** flattened, granny emoji → gift icon
- **Richer search** — gradient avatars, school + mutuals, "follows you" badges
- **Light mode** — new `lightMode` tweak retints every screen (the gifter page stays its own light brand surface)

One caveat: Say-it dictation is still faked, as agreed — that's for the coding phase.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

Both fixed: the dibs pills no longer wrap, and the status bar switches to dark text on the gifter preview so it stays legible on the cream page. Prototype is ready for the coding phase.

