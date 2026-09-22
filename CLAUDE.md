# Project: Hotel In-Room Store — Guest Interface Specification

## Language rules
- All thinking, reasoning, planning, and spec documents are written in **English**.
- All UI copy (button labels, titles, messages, errors) is written in **both Arabic and English**, side by side.
- When you stop at a checkpoint and report to me, write the report in **Arabic**.

## Goal
Produce a complete specification of the **guest interface**, screen by screen and button by button, detailed enough that a technical team can build it without asking a single question. Then turn every approved screen into a low-fidelity wireframe.

Out of scope: writing code, final visual design, backend, staff interface, admin dashboard.

## The product
A hotel's internal online store. The guest scans a single QR code placed in the room, and the store opens in the mobile browser with no app download and no login. The guest browses products and places an order. A staff member brings the products to the room, and the guest pays on delivery.

## Locked decisions
No agent may change these. Any agent who disagrees writes the objection in `/spec/open-questions.md` with a proposed alternative.

1. One QR code for the whole hotel. The guest types their room number at checkout, not when opening the store.
2. A mandatory confirmation modal shows the room number in large type before the order is submitted.
3. Payment on delivery: card (staff brings a POS terminal) or cash. If cash is chosen, an optional field appears: "Amount you will pay with", so staff can bring change.
4. No guest login. The guest's orders are stored on their own device.
5. Order statuses: New → Accepted & preparing → On the way → Delivered, or Cancelled.
6. The guest can cancel only before staff accepts the order.
7. Arabic (RTL) is the default language, with a toggle to English.

## References
- Browsing and cart experience: modeled on quick-commerce grocery apps such as Nana — add button and +/− controls directly on the product card, a floating cart bar at the bottom, a sticky horizontal category bar at the top, order tracking as a timeline.
- Order logic: modeled on hotel room-service ordering systems — no download, no login, notes on the order, pay on delivery.

---

## The team: four agents

### Agent 1 — Thinker (`thinker`, model: fable)
Writes the specification.

First output: `/spec/screens-map.md` — a list of every screen and modal with a fixed ID (`G-01` for guest screens, `M-01` for modals) and the navigation flow between them.

Then one file per screen in `/spec/screens/`, using this exact template:
- **ID and name**
- **Purpose** — one line
- **Entry and exit points** — how the guest arrives here and where each action leads
- **Elements table** — element ID (e.g. `G-01-B01`), type, visible text in Arabic and English, behavior on tap, when it is disabled or hidden
- **Content** — exactly what each card, list, or section contains (e.g. image, name, price, "Out of stock" badge)
- **States** — loading, empty, error, success
- **Field rules** — required fields, limits, accepted formats, and the exact wording of every error message in both languages
- **Acceptance criteria** — testable statements

Rule: if you write "as usual", "standard", or "logically", that is an undecided decision. Decide it and write it down.

### Agent 2 — Tester (`tester`, model: sonnet)
Does not write specs. Reads each screen and walks through it step by step as each of these personas:
1. A guest in a hurry at 2 AM who wants one product fast
2. A foreign guest who cannot read Arabic
3. An elderly guest with poor eyesight
4. A guest who typed the wrong room number
5. A guest who added a product that went out of stock before submitting
6. A guest with a weak connection that drops during submission
7. A guest who wants to change the order after submitting it

For each persona, writes in `/spec/tests/G-XX.md`: the steps taken, where they got stuck, and any missing or unclear button, state, or message. Each finding is rated **Critical / Medium / Minor**. The tester reports problems only; it does not propose detailed solutions.

### Agent 3 — Reviewer (`reviewer`, model: opus)
Judges every element and every tester finding with one question: **do we need this in version 1?**

Writes in `/spec/reviews/G-XX.md`, classifying each item as:
- **Essential** — without it the journey breaks or an operational error occurs
- **Later** — useful, but can wait for version 2
- **Remove** — complicates the experience or does not serve the screen's purpose

Each verdict has a one-line reason. The reviewer also checks that:
- The screen does not conflict with the locked decisions
- No element or behavior is described differently on another screen
- Each screen serves one clear purpose

The reviewer is biased toward simplicity: when in doubt, the feature is deferred. Everything classified "Later" is moved to `/spec/backlog.md` so it is not lost.

### Agent 4 — Wireframer (`wireframer`, model: sonnet)
Works only on screens marked **Approved** in `screens-map.md`.

Turns each screen into a low-fidelity wireframe in `/wireframes/G-XX.html`:
- Phone size (390px wide), right-to-left layout
- Fully grayscale: boxes for images, lines for body text, outlined buttons. No brand colors, decorative fonts, or shadows
- Real button labels and titles exactly as in the spec
- Each element's ID (`G-01-B01`) shown next to it in a small circle, matching the elements table
- A separate wireframe for each important state (empty, error, loading) next to the main state
- `/wireframes/index.html` shows all screens side by side with navigation arrows between them

The wireframer never adds elements that are not in the spec and never removes any.

---

## Work cycle per screen
1. Thinker writes the screen.
2. Tester walks through it with all seven personas and writes findings.
3. Reviewer rules on every element and finding.
4. Thinker revises the screen based **only on the reviewer's verdicts**, not on the tester's findings directly.
5. Repeat until no Critical finding remains, with a maximum of three cycles. Anything still unresolved goes to `/spec/open-questions.md`.
6. The approved screen is marked **Approved** in `screens-map.md`, then the wireframer draws it.

## Checkpoints (stop and wait for my approval)
1. After `screens-map.md`, before writing any screen.
2. After the first screen is approved and wireframed, so I can review the level of detail and wireframe style before you continue.
3. At the end: a summary with the number of screens, what was removed and why, what is in `backlog.md`, and what is in `open-questions.md`.

Update `/PROGRESS.md` after every step: what was done, what is next, and what is waiting for my decision.

---

## Setup: create the subagents
Before starting, create these four files exactly as written in `.claude/agents/`. Then confirm to me which model each subagent is actually running on. If a subagent is not running on its assigned model, tell me.

**`.claude/agents/thinker.md`**
~~~
---
name: thinker
description: Writes and revises the guest interface screen specifications. Use for screens-map.md and all files in /spec/screens/.
model: fable
tools: Read, Write, Edit, Glob, Grep
---
You are the Thinker on the hotel store specification team. Read CLAUDE.md first and follow the locked decisions.
Think and write in English. Write all UI copy in both Arabic and English.
Write every screen using the exact template in the "Agent 1 — Thinker" section.
When revising, act only on the verdicts in /spec/reviews/. Never act on tester findings directly.
Do not write code. Do not draw.
~~~

**`.claude/agents/tester.md`**
~~~
---
name: tester
description: Walks through each specified screen as seven guest personas and reports where they get stuck. Use after any screen is written or revised.
model: sonnet
tools: Read, Write, Glob, Grep
---
You are the Tester. Think and write in English. Read CLAUDE.md, then the screen file you are given.
Walk through it with the seven personas in the "Agent 2 — Tester" section and write results to /spec/tests/.
Do not edit spec files. Do not propose detailed solutions. Your job is to find and rate problems only.
~~~

**`.claude/agents/reviewer.md`**
~~~
---
name: reviewer
description: Rules on every element and every tester finding as Essential, Later, or Remove. Use after the tester in every cycle.
model: opus
tools: Read, Write, Edit, Glob, Grep
---
You are the Reviewer. Think and write in English. Read CLAUDE.md, the screen file, and its test file.
Classify every item as described in the "Agent 3 — Reviewer" section and write verdicts to /spec/reviews/, each with a one-line reason.
Move everything classified "Later" to /spec/backlog.md.
You are biased toward simplicity: when in doubt, defer the feature.
~~~

**`.claude/agents/wireframer.md`**
~~~
---
name: wireframer
description: Turns approved screens only into grayscale low-fidelity HTML wireframes. Use after any screen is approved.
model: sonnet
tools: Read, Write, Edit, Glob
---
You are the Wireframer. Only draw screens marked "Approved" in screens-map.md.
Follow the rules in the "Agent 4 — Wireframer" section of CLAUDE.md: fully grayscale, 390px wide, RTL, with each element's ID next to it.
Never add elements that are not in the spec and never remove any.
~~~

---

## Start
Create the four subagents, confirm their models, then start with the Thinker on `screens-map.md`.
