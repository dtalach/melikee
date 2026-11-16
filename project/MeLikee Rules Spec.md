# MeLikee — product rules for developers

Companion to `MeLikee Teen Prototype.dc.html`. The prototype shows these behaviours; this file states them. Where the prototype uses sample data, the real rule is given here.

## Glossary
- **Shiny** — one wanted item. Brand word in UI copy; "item" in code.
- **List** — a named group of shinies. Every account starts with **My wants**, **Sweet 16** (birthday list) and **Secret stash** (starts Private). All three are ordinary lists.
- **Dibs** — a gifter's claim on a shiny. Secret from the wisher.
- **Gifter** — anyone viewing a list, in the app or via link.
- Buttons: **Want it** (your own add) · **Want it too** (copy a friend's shiny into My wants) · **Call dibs** (claim as gifter).

## Accounts and age
- Onboarding: birthday (month, day, year) → handle → parent → default sharing → contacts.
- Year is never shown to anyone. Age = years since birth date, today.
- **Under 13:** a parent must be connected before the user can add friends or share. Parent request goes by text/email.
- **13+:** parent is optional and can be added from Settings → Parent view.
- Parent can see: shared lists, friends, friend requests; can approve new friends if enabled. Parent can never see: private lists, who called dibs.
- Handle: 3–20 chars, `a–z 0–9 _ .`, unique, changeable.

## Sharing (per list)
One scale, three steps:
| Setting | Who sees it |
|---|---|
| Private | Only the owner |
| Friends | Friends the owner has granted access (per friend, per list) |
| Friends + link | Friends with access **plus** anyone holding the list's link, no app needed |

- Changing a list's setting applies to every shiny on it. There is no per-item privacy.
- Downgrading notifies nobody. Friends + link → Friends or Private: the link stops working immediately.
- Copying a list's link from the share sheet upgrades it to Friends + link.
- Private lists never appear in Feed, gifter pages, parent view or friend access pickers.
- Link expiry options: until day after the list's date · 30 days · always. "Reset link" issues a new URL and kills the old one.

## Countdowns and dates
- Birthday list countdown = days from today to the next occurrence of the user's birthday.
- Any list may have an optional date (month + day); countdown uses the same rule.
- Friends within **14 days** of their birthday get the pink ring and are sorted first.
- Prototype fixes "today" as Aug 5, 2026 — replace with the real date.

## Capture and matching
Entry: Snap (photo), Scan (barcode, auto-captures), Say (hold shutter), camera roll, pasted link, iOS share sheet.

Match states shown on the found sheet:
| Source | Badge | Secondary action |
|---|---|---|
| Barcode | Exact · barcode | Wrong product? |
| Product link | From your link | Wrong product? |
| Trending / catalog | From trending | Wrong product? |
| Typed search | Search result | Wrong product? |
| Photo / screenshot / voice | Looks like · NN% | Not it |

- Below a confidence threshold, show "Can't tell what this is": Try again · Type it · Save photo.
- A link with no product: "No product on that page": Save link anyway · Type it.
- **Pending** shinies (saved photo/link/video): no price or stores shown; gifters see "Still choosing" and cannot call dibs. When a match is found, notify "We think we found it" → Yes / Let me pick.
- Corrections ("Wrong product?", picking a near match, typed search) should be logged as training signal.
- Duplicate: if the same product exists on any list, show "Already in {list}" and label the button "Add again".
- Destination list defaults to the last list used; changeable on the sheet before adding.

## Prices
- Found sheet shows the best current price and store, with other stores on tap.
- Price alerts default **on** per shiny; toggle from the add confirmation and item detail.
- Price drop = current price below the 30-day high. Show "↓ $N" on the item and list row.

## Dibs (gifter rules)
- The wisher never sees which shinies are claimed or by whom. They may receive a non-specific "Something's coming" notification.
- First dibs asks the gifter for a display name, shown to other gifters only.
- One claim per shiny. Claimed by someone else: "{name} has it" / "Someone has it", disabled.
- Chip-in items accept multiple anonymous contributions.
- After dibs: show "Buy at {store} →" (affiliate link).

## After the occasion
- Day after a dated list's date: prompt "Got it / Still want" per shiny. Got it removes; Still want moves to My wants.
- Lists can be archived (hidden, restorable) or deleted (removes shinies). My wants can't be archived or deleted.

## Notifications
Types: price drop · friend birthday (14 and 3 days before) · someone wants yours too · something's coming · friend request / accepted · match found.
- Each type can be turned off in Settings → Notifications. Quiet hours default 10pm–7am.
- Unread state per notification; grouped Today / Earlier; "Mark all read".
- Tapping opens the related screen and marks it read.

## Safety
- Friend search shows mutual friends, never school or location.
- Block prevents finding, viewing and requesting; optional report goes to human review. Neither action notifies the other person.
- Friends tab lists everyone holding a gifter link (by the name they gave), so the user knows who outside the app can see their lists.
