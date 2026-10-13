# Planning Poker

A lightweight, browser-based Planning Poker application for collaborative story estimation. A facilitator creates a room, participants join with a short code, and estimates remain hidden until the host reveals them.

The project was built as a time-boxed (6 hours), vertically sliced software engineering project. It uses an in-memory server and short-interval HTTP polling to provide multi-user collaboration without accounts, a database, or WebSockets.

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
  product-decisions.md
  mvp-*.md            MVP flow and vertical-slice plan
  planning-poker-extended-features-vertical-slices.md
  slice-*/            Per-slice test plans and manual evidence
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

Testing covers room rules, HTTP behavior, authorization, hidden-vote privacy, state transitions, session restoration, lifecycle handling, browser-storage failures, non-overlapping polling, and React interactions. Each implemented slice also has a manual browser test plan and recorded evidence under `docs/slice-*`.

The final [Slices 1–14 review](docs/slice-1-14-review.md) records 33 passing client tests, 59 passing server tests, and a successful production build. It also documents five resolved validation, capacity, storage, polling, and feedback issues. A production dependency vulnerability audit was not completed because registry access was unavailable during that review.

There is currently no repository CI/CD workflow or lint script; tests and the production build are run locally.

## AI-assisted development approach

AI support was integrated throughout the software development lifecycle, while product decisions, acceptance, and integration remained under human control.

### Project organisation and planning

The work began with a [product decision record](docs/product-decisions.md), comparison of feasible technical approaches, and selection of a lobby-first [user flow](docs/mvp-user-flow.md). Requirements were separated into confirmed behavior, assumptions, open questions, and deferred options before implementation. The repository history preserves planning separately from implementation.

### MVP phase

The [MVP plan](docs/mvp-vertical-slices.md) divided the core flow into Slices 1–7: create a room, join and synchronize the lobby, add a story, vote privately, reveal, revote, and move to the next story. Each slice delivered a testable user outcome across the React client, HTTP API, in-memory domain rules, automated tests, and manual acceptance checks.

### Extended features phase

After the MVP passed its acceptance checks, a separate [extended-features plan](docs/planning-poker-extended-features-vertical-slices.md) introduced preset decks, completed-round history, same-tab restoration, host-disconnection handling, and explicit room ending. Custom decks were deliberately cancelled as Slice 9 to protect the time box and avoid partially delivering validation-heavy functionality.

### Vertical slice development

Each slice was planned small enough for a focused commit and described by one user outcome, affected areas, acceptance criteria, and tests. Implementation proceeded only after product decisions were confirmed. Automated checks were followed by human-run browser scenarios, with results recorded in each slice's test-plan directory.

### Usability improvement phase

Slice 14 consolidated observed usability issues: copying room codes, identifying the current user, leaving rooms, returning home, and remembering display names. Follow-up decisions removed duplicate host actions while retaining a clear exit from an ended room. The [Slice 14 specification](docs/slice-14/slice-14-usability-improvements.md) and [test plan](docs/slice-14/slice-14-test-plan.md) capture the final behavior.

### AI-assisted final code review

After Slices 1–14, an AI-assisted read-only review examined security, logic, reliability, and edge cases across the complete codebase. It produced five concrete findings: missing server-side length limits, uncapped room participation, unsafe storage-failure handling, overlapping/stale polling requests, and copy feedback that did not reset. All five were fixed and regression-tested; details and verification results are in the [review report](docs/slice-1-14-review.md).

### Collaboration workflow

AI assisted with requirement analysis, trade-off challenges, slice planning, documentation, implementation, test creation, debugging, and the final review. The human developer selected product behavior, approved material decisions, ran and confirmed the documented manual checks for accepted slices, decided what to defer or cancel, and retained responsibility for validation and integration. Pending checks remained explicitly recorded. This created a repeated loop of **decide → implement → automate → manually verify → document → commit**.

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

