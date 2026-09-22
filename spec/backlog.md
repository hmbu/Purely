# Backlog — deferred to version 2

Owner: Reviewer (Agent 3)
Purpose: nothing classified **Later** in `/spec/reviews/` is lost. Every item here was judged useful but not required for version 1.

## How to use this file

- One section per screen or modal, in ID order (`G-01` … `G-08`, then `M-01` … `M-04`). A later reviewer cycle **appends** a new section or new rows; it never rewrites another screen's section.
- Every row carries: the **source screen ID**, the **item**, and the **one-line reason for deferring**.
- The `Ref` column points at the finding or element ID in that screen's review file, so the ruling behind the deferral can always be found.
- An item leaves this file only when the product manager pulls it into a version; the reviewer never promotes an item on its own.
- Items classified **Remove** are *not* listed here — they are rejected, and the reason lives in the review file.

---

## G-01 — Store (المتجر)

Source review: `/spec/reviews/G-01.md` (cycle 1). Four Later verdicts, plus one partly-deferred ruling.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-01-L1 | F-01 | **Product search on G-01** — a search field in or under the header that filters the catalog by product name. | Genuinely useful once the catalog grows, but a room-store catalog navigable by category chips does not break without it. |
| G-01-L2 | F-02 | **Progress feedback and an early escape during the catalog load** — a visible progress or elapsed-time cue, and a guest-initiated "try again now" before the 10-second timeout. | The wait already ends in G-08 with a Retry, so the journey completes; this is comfort during a wait, not a fix for a break. |
| G-01-L3 | F-08 (deferred part) | **Verified large-text layout** — product cards, 2-line name truncation and the sticky bars tested and reflowing correctly at 200 % browser text scaling. | v1 only guarantees that zoom and text scaling are never disabled; a tested reflowing layout is a design-and-build effort beyond a spec line. |
| G-01-L4 | F-13 | **Fresher active-order status on the banner** — a retry after a failed status fetch, or a "last updated" indication when the shown status may be stale. | G-06 holds the live status and is one tap from the banner, so a stale label is a trust nuisance, not a broken journey. |
| G-01-L5 | F-14 | **Indication of more than one active order** — a count or "+1 more" on the banner when the device holds several active orders. | "My orders" (B02) is permanently visible in the header and lists them all, so no order is unreachable. |

---

## G-02 — Product details (تفاصيل المنتج)

Source review: `/spec/reviews/G-02.md` (cycle 1). Five Later verdicts, all from tester findings; no element and no screen decision was deferred.

| # | Ref | Item | Reason for deferring |
|---|---|---|---|
| G-02-L1 | F1 | **A language toggle reachable from G-02** — a way to switch Arabic ↔ English without going back to G-01 (for example a toggle in G-02's header, whose end edge is deliberately empty in v1). | The foreign guest sets the language on G-01 before ever reaching a product and the choice is saved on the device, so the detour exists only once, on a first open. |
| G-02-L2 | F3 | **A zoomable or full-screen product image** — tapping C02 to enlarge the photo, or a pinch-zoom viewer for reading on-package text. | Page pinch-zoom is already guaranteed and enlarges a full-width photo, so a dedicated image viewer is polish, not a missing step. |
| G-02-L3 | F5 | **Defined reflow for the badge and helper strings at enlarged text size** — a stated wrap/truncation rule for C07, C06, C08 and C13 when the guest raises the browser or OS text size. | v1 guarantees only that zoom and text scaling are never disabled; a verified layout at enlarged sizes is design-and-build work (it joins G-01-L3). |
| G-02-L4 | F7 | **"Read more" for long descriptions** — expanding the description beyond the 500-character cut instead of ending it with "…". | Hotel room-store descriptions are short; this is a scale problem that appears with a catalog version 1 does not have. |
| G-02-L5 | F10 | **Keeping the G-01 scroll position across a reload of G-02** — returning to the position the guest left instead of the top of the list after a reload or direct-URL open. | The guest still lands on G-01 and can browse on, so this is comfort on a rare path, not a broken journey. |

---

*(Later screens append their sections below this line.)*
