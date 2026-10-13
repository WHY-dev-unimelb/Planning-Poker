# Slice 10 Test Plan: Room Keeps Completed-Round History

- **Slice:** 10 — Room keeps completed-round history
- **Status:** Accepted; automated and manual verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-10-room-keeps-completed-round-history)

## Test objective

Verify that every successful reveal creates an immutable, credential-free snapshot that remains available through revotes, later stories, polling, and late participant joins for the lifetime of the in-memory room.

## Scope

This plan covers:

- History snapshot creation on reveal
- Story and round numbering
- Revote and next-story history retention
- Participant labels, roles, estimates, and no-vote results
- Late-join access to earlier history
- History privacy and snapshot immutability
- React history display without duplicating the current revealed result
- Existing in-memory lifetime behavior

Persistent history across server restarts remains out of scope.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing MVP and preset-deck tests continue to pass.
- The first reveal creates story 1, round 1.
- A reveal after revote creates story 1, round 2.
- Revealing the next story creates story 2, round 1.
- Earlier snapshot values remain unchanged after later votes and joins.
- A late join response includes every earlier revealed snapshot.
- History contains no participant token or other credential.
- Current revealed estimates remain in the main results view.
- The history section displays earlier rounds without duplicating the current result.
- The production client build completes successfully.

## Manual browser test procedure

### Start the application

Open two terminals at the repository root.

Terminal 1:

```text
npm run dev:server
```

Terminal 2:

```text
npm run dev:client
```

Open the client URL printed by Vite, normally `http://localhost:5173`.

### Test A: Record the first revealed round

1. Create a room and join from a second browser window.
2. Add **First story**.
3. Submit different estimates from both clients.
4. Reveal from the host window.

Expected:

- The current estimates appear in the normal results view.
- A separate **Round history** section is not shown yet because it would duplicate the current result.

### Test B: Retain history during a revote

1. Start a revote for **First story**.
2. Inspect both clients before submitting new estimates.

Expected:

- **Round history** now shows **Story 1, round 1**.
- It shows the original story text and first-round results.
- The active voting cards are clean and the first-round values are not selected.

3. Submit different estimates and reveal again.

Expected:

- The new values appear in the current results view.
- History continues to show the original first round unchanged.

### Test C: Retain both revote rounds for the next story

1. Start **Second story**.
2. Inspect the history section.

Expected:

- History shows **Story 1, round 1** and **Story 1, round 2** in order.
- Both snapshots retain their original estimates.
- Voting for **Second story** is active and clean.

3. Submit estimates for the second story and reveal.

Expected:

- The current results view shows the second-story estimates.
- Prior first-story rounds remain visible in history.

### Test D: Show history to a late joiner

1. After one or more reveals, open a third browser window.
2. Join using a new display name.

Expected:

- The late participant sees all earlier revealed rounds.
- Historical snapshots do not add the late participant retroactively.
- The late participant can take part in the active round normally.

### Test E: Preserve no-vote results and participant labels

1. Start another round.
2. Leave one participant without a vote and reveal.
3. Move on so the round appears in history.

Expected:

- The historical result shows the participant's original full label, including numeric identifier.
- The missing estimate is displayed as **No vote**.

### Test F: Confirm history privacy and in-memory lifetime

1. Inspect the raw room-state response after one or more reveals.
2. Restart the server and request the old room code.

Expected:

- History contains story and revealed-result data but no participant tokens.
- The old room and all of its history disappear after server restart.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **41 passed**.
- Client automated tests: **20 passed**.
- Client production build: **passed**.
- Server snapshot numbering, immutability, revote retention, next-story retention, and late-join access: **passed**.
- History credential-removal check: **passed**.
- Client history display and current-result deduplication: **passed**.
- Manual browser procedure: **passed; confirmed by the user on 13 October 2026**.

## Exit criteria

Slice 10 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- all clients see the same ordered snapshots; and
- history contains no private participant credentials.
