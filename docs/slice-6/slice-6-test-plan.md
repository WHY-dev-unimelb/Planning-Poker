# Slice 6 Test Plan: Host Starts a Revote

- **Slice:** 6 — Host starts a revote
- **Status:** Accepted; automated and manual verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-6-host-starts-a-revote)

## Test objective

Verify that the host can restart voting after reveal for the same story, while removing every previous estimate, status marker, revealed result, and local card selection.

## Scope

This plan covers:

- Host-authorized `POST /api/rooms/:roomCode/revote`
- Revealed-to-voting state transition
- Preservation of the current story
- Complete vote reset
- Removal of revealed results rather than retaining history
- Local card-selection reset
- Revote synchronization through polling
- Fresh vote submission after reset

Moving to a different story is outside Slice 6 and begins in Slice 7.

## Prerequisites

1. Complete the Slice 1–5 prerequisites.
2. Create a room with a host and at least one participant.
3. Add a story, submit votes, and reveal the round.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slice 1–5 tests continue to pass.
- A valid host token starts a revote after reveal.
- Revote before reveal receives `409`.
- A participant token receives `403` when attempting revote.
- The story text remains unchanged.
- Every server-side vote is removed.
- Every participant returns to `hasVoted: false`.
- No revealed `vote` property remains in public room state.
- A participant can submit a fresh vote after reset.
- React returns from results to the voting-card view.
- React clears the current user's selected-card state.
- Participants never receive a revote control.
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

### Test A: Show revote only after reveal and only to the host

1. Create and join a room in separate browser windows.
2. Add a story and inspect the voting state.
3. Submit votes and reveal.
4. Inspect both revealed views.

Expected:

- **Revote** is absent before reveal.
- After reveal, only the host sees **Revote**.
- Participants see results but no revote control.

### Test B: Start a clean revote

1. In the host window, select **Revote**.

Expected:

- The host immediately returns to the voting-card view.
- Within approximately one second, participant windows also return to voting.
- The same story remains active in every window.
- The previous results list disappears.
- No previous estimate remains selected.
- Every participant is marked **Not voted**.

### Test C: Confirm there is no history

Inspect the host and participant views after the reset.

Expected:

- The previous revealed estimates cannot be viewed.
- There is no history list or previous-round summary.
- Only the clean active round remains.

### Test D: Submit fresh votes

1. Have the participant select a new card.
2. Have the host select a new card.

Expected:

- Both new votes succeed.
- Voted/not-voted status updates through polling.
- The previous round's values do not influence the new selections.

### Test E: Confirm revote authorization and state rules

Send direct revote requests before reveal and with a participant token.

Expected:

- A host revote request before reveal receives HTTP `409`.
- A participant revote request after reveal receives HTTP `403`.
- Neither invalid request changes the room state.

## Live API smoke test

Create a room, join a participant, add a story, submit votes, reveal, attempt participant revote, start host revote, and submit a fresh vote.

Verify:

- Room status returns to `voting`.
- The story is unchanged.
- All voted markers are initially false.
- No revealed vote values remain.
- Participant revote receives `403`.
- A fresh valid vote receives `200`.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **31 passed**.
- Client automated tests: **15 passed**.
- Client production build: **passed**.
- Live API same-story revote reset: **passed**.
- Live API revealed-value removal: **passed**.
- Live API participant authorization rejection: **passed** with status `403`.
- Live API fresh vote after reset: **passed** with status `200`.
- Manual browser procedure: **passed; confirmed by the user on 13 October 2026**.

## Exit criteria

Slice 6 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–E pass in local browser sessions;
- every client returns to the same clean voting state; and
- no previous estimate or result remains accessible.

