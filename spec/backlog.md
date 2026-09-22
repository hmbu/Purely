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

*(Later screens append their sections below this line.)*
