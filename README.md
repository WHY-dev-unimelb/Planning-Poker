# Planning Poker

A lightweight, browser-based Planning Poker application for collaborative story estimation. A facilitator creates a room, participants join with a short code, and estimates remain hidden until the host reveals them.

The project was built as a time-boxed (6 hours), vertically sliced software engineering project. It uses an in-memory server and short-interval HTTP polling to provide multi-user collaboration without accounts, a database, or WebSockets.

### History of My Interaction with the AI Tool

The [complete shared chat](https://chatgpt.com/s/cx_6ad0bc3823bc8191bf9058c9ce932fce) is the primary record of how Codex supported requirements analysis, product decisions, implementation, testing, and documentation. Focused branch conversations were used for isolated questions, including the final cross-slice review, while durable decisions and outcomes were kept in repository documentation.

The [`docs/ai interaction screenshots`](<docs/ai interaction screenshots/>) folder contains a curated set of prompt-and-response screenshots so that the main decision points can be reviewed without reading the entire chat:

| Screenshot | What it shows |
| --- | --- |
| [1. Requirements](<docs/ai interaction screenshots/1.requirements.png>) | The initial brief analysis, separating clear requirements, assumptions, open questions, optional scope, and the 6–8 hour constraint. |
| [2. MVP planning](<docs/ai interaction screenshots/2.MVP planning.png>) | AI-generated product options and trade-offs for rooms, host permissions, voting, reveal, rounds, disconnection, and persistence. |
| [3. Product decisions](<docs/ai interaction screenshots/3.product decisions.png>) | My selected behaviours and the resulting repository decision record, demonstrating that final product choices remained human-controlled. |
| [4. User flow](<docs/ai interaction screenshots/4.user flow.png>) | My selection of the lobby-first flow and the resulting updates to the product decisions and MVP user-flow documents. |
| [5. Architecture](<docs/ai interaction screenshots/5.architecture.png>) | Comparison of client-only React, React with an HTTP API, and React with Express plus Socket.IO. |
| [6. Architecture reflection](<docs/ai interaction screenshots/6.architecture reflection.png>) | A deliberate challenge to my preferred HTTP approach, including polling, privacy, state-authority, and time-box risks. |
| [6. Vertical slices](<docs/ai interaction screenshots/6.vertical slices.png>) | The decision to defer extended features and divide the MVP into small, testable vertical slices. |
| [7. Vertical-slice development and testing](<docs/ai interaction screenshots/7.vertical slice development & testing.png>) | The repeated acceptance gate: I confirmed tests and manual behaviour before authorising documentation updates and the next slice. |
| [8. Extended-features planning](<docs/ai interaction screenshots/8.Extended features planning.png>) | Extension planning only after the complete MVP had passed verification, with remaining time treated as a scope constraint. |
| [9. Usability improvement](<docs/ai interaction screenshots/9.usability improvement.png>) | Human-observed usability problems being reviewed and converted into the focused Slice 14 specification. |

These screenshots complement, rather than replace, the linked plans, commits, automated tests, and manual verification evidence.

### Technology stack

| Area | Technology |
| --- | --- |
| Client | React 19, Vite 8, JavaScript, CSS |
| Server | Node.js, Express 5 |
| Testing | Vitest, React Testing Library, jsdom, Supertest |
| Collaboration | JSON HTTP API with sequential one-second polling |
| State | In-memory room store; browser storage for local session conveniences |

## Getting started

### Prerequisites

- Node.js `20.19+` or `22.12+`
- npm

### Install

```bash
git clone https://github.com/WHY-dev-unimelb/Planning-Poker.git
cd Planning-Poker
npm ci
```

No database, external service, or required environment file is needed.

### Run locally

Start the API and client in separate terminals from the repository root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open the URL printed by Vite, normally `http://localhost:5173`. The API listens on `http://localhost:3001`, and Vite proxies `/api` requests to it.

The server accepts an optional `PORT` environment variable. When changing it for local development, update the proxy target in `client/vite.config.js` as well.

## Usage

1. Enter a display name, choose an estimation deck, and create a room.
2. Copy the six-character room code and share it with the team.
3. Participants enter the code and their display name to join the lobby.
4. The host adds a story, which starts voting.
5. Participants choose or change an estimate. Before reveal, others see only whether each person has voted.
6. The host reveals at any time, then chooses **Revote** or starts the **Next story**.
7. The host ends the room when finished; participants may leave independently.

Refresh restores a room only in the same browser tab. Closing the tab, leaving the room, or restarting the server may invalidate the room session as described in [Product decisions](docs/product-decisions.md).

## Architecture and project structure

```text
client/
  src/App.jsx         React UI, room workflow, polling, and browser storage
  src/api.js          HTTP API client
  src/App.test.jsx    Client integration and interaction tests
  vite.config.js      Vite, jsdom, and development proxy configuration
server/
  src/app.js          Express routes and HTTP error mapping
  src/rooms.js        In-memory room model, rules, authorization, and privacy
  src/server.js       API process entry point
  test/               Room-store and HTTP API tests
docs/
  ai interaction screenshots/ Curated AI prompt-and-response evidence
  product-decisions.md
  mvp-*.md            MVP flow and vertical-slice plan
  planning-poker-extended-features-vertical-slices.md
  Vertical Slice Development Workflow.png
  slice-*/            Per-slice test plans and Manual Verification evidence
    Manual Verification/  Human-run screenshots and recordings
  slice-1-14-review.md Final cross-slice review and resolutions
```

The React client calls the Express API and polls for shared room state. Private participant tokens authorize mutations but are excluded from public room responses and history. Active vote values are also omitted until reveal. The server is the source of truth for room state, role permissions, input limits, participant capacity, and valid state transitions.

All room data is held in process memory. Restarting the server deletes active rooms, ended-room tombstones, votes, and history.

## Testing and quality assurance

Run the complete automated suite:

```bash
npm test
```

Run the client production build:

```bash
npm run build
```

Workspace-specific tests are also available:

```bash
npm run test --workspace client
npm run test --workspace server
```

Testing covers room rules, HTTP behavior, authorization, hidden-vote privacy, state transitions, session restoration, lifecycle handling, browser-storage failures, non-overlapping polling, and React interactions. Each implemented slice also has a manual browser test plan, with human-run screenshots and recordings stored under `docs/slice-*/Manual Verification/`.

The final [Slices 1–14 review](docs/slice-1-14-review.md) records 33 passing client tests, 59 passing server tests, and a successful production build. It also documents five resolved validation, capacity, storage, polling, and feedback issues. A production dependency vulnerability audit was not completed because registry access was unavailable during that review.

There is currently no repository CI/CD workflow or lint script; tests and the production build are run locally.

## AI-assisted development approach

AI support was integrated throughout the software development lifecycle, while product decisions, acceptance, and integration remained under human control.

*Table 1. Development phases, produced artefacts, human–AI collaboration, and Git evidence*

| Development phase | Produced artefacts | Human-in-the-loop collaboration | Git evidence |
| --- | --- | --- | --- |
| 1. Initial planning | Product decision record; lobby-first user flow; technical approach | **AI:** analysed requirements and proposed options. **Human:** selected the product direction and made the final decisions. | [Decisions](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/c167e28); [user flow](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/5898cc1) |
| 2. MVP planning | MVP scope; Slices 1–7 plan; acceptance checks; test strategy | **AI:** proposed slice boundaries and acceptance checks. **Human:** approved the scope, order, and priorities. | [MVP documentation](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/bcbea0e) |
| 3. MVP vertical-slice development | Working MVP; automated tests; slice test plans; manual verification evidence; updated documentation | **AI:** assisted implementation, test planning, and automated testing. **Human:** performed manual verification and accepted each slice. | [Slices 1–7](https://github.com/WHY-dev-unimelb/Planning-Poker/compare/6b9284f...6577b52) |
| 4. Feature-extension planning | Extended-feature plan; priority decisions; revised slice scope; Slice 9 cancellation record | **AI:** proposed possible extensions. **Human:** approved, deferred, or cancelled features. | [Extension plan](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/d3fce30); [Slice 9 cancelled](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/83a019f) |
| 5. Feature-extension vertical-slice development | Slices 8 and 10–13; extended-feature tests; manual verification evidence; supporting documentation | **AI:** assisted implementation and regression testing. **Human:** performed manual verification and accepted each extension. | [Slice 8](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/20cc084); [Slices 10–13](https://github.com/WHY-dev-unimelb/Planning-Poker/compare/b7a3615...cc1dcb7) |
| 6. Usability improvement and final review | Slice 14 usability improvements; code-review findings; review fixes and regression tests; updated README | **AI:** supported refinement, code review, and regression testing. **Human:** identified issues, evaluated findings, and validated the final result. | [Plan and clarification](https://github.com/WHY-dev-unimelb/Planning-Poker/compare/e3a79b7...caf2521); [Slice 14](https://github.com/WHY-dev-unimelb/Planning-Poker/commit/dd3cb1d); [review and fixes](https://github.com/WHY-dev-unimelb/Planning-Poker/compare/1220823...fc0d68a) |

### Repeated vertical-slice workflow

Each implementation slice followed the same human-in-the-loop engineering cycle. AI assisted with implementation and test planning, but automated tests and manual verification acted as separate gates. I accepted, revised, or rejected the result before documentation and commit.

![Vertical Slice Development Workflow](<docs/Vertical Slice Development Workflow.png>)

The underlying evidence remains available in the [MVP plan](docs/mvp-vertical-slices.md), [extended-feature plan](docs/planning-poker-extended-features-vertical-slices.md), per-slice `Manual Verification` folders, [Slice 14 specification](docs/slice-14/slice-14-usability-improvements.md), and [final review](docs/slice-1-14-review.md).

## Current limitations

- Room and history data are not persistent and disappear on server restart.
- There are no user accounts, durable authentication, host transfer, or precise presence tracking.
- Collaboration uses polling rather than a real-time socket connection.
- The 15-second host lease is suitable for this demonstration but would normally be longer in production.
- The client build and API are not bundled into a production deployment configuration.

## Documentation

- [Product decisions](docs/product-decisions.md)
- [MVP user flow](docs/mvp-user-flow.md)
- [MVP vertical slices](docs/mvp-vertical-slices.md)
- [Extended-feature vertical slices](docs/planning-poker-extended-features-vertical-slices.md)
- [Slices 1–14 review](docs/slice-1-14-review.md)

