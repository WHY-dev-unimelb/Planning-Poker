# Slice 5 Test Plan: Host Reveals Estimates

- **Slice:** 5 — Host reveals estimates
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-5-host-reveals-estimates)

## Test objective

Verify that only the host can reveal an active round, that reveal may happen before everyone votes, that all clients receive the same explicit results, and that voting is frozen after reveal.

## Scope

This plan covers:

- Host-authorized `POST /api/rooms/:roomCode/reveal`
- Early reveal with one or more non-voters
- Voting-to-revealed state transition
- Revealed participant estimates
- Explicit `No vote` presentation
- Removal of voting controls after reveal
- Rejection of post-reveal votes
- Revealed-state synchronization through polling

Revote and next-story actions are outside Slice 5 and begin in Slices 6 and 7.

## Prerequisites

1. Complete the Slice 1–4 prerequisites.
2. Create a room with a host and at least two participants.
3. Add a story so voting is active.
4. Have only one participant submit a vote before the early-reveal test.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slice 1–4 tests continue to pass.
- A valid host token reveals an active round.
- A participant token receives `403` when attempting reveal.
- Reveal succeeds while some or all room members have not voted.
- Submitted estimates appear only in revealed room state.
- Every non-voter receives a `null` vote in the API and **No vote** in the client.
- Vote requests after reveal receive `409`.
- React removes card controls after reveal.
- React displays submitted estimates and explicit non-voter results.
- A participant receives the revealed state through polling without seeing a reveal control.
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

### Test A: Show reveal control only to the host

1. Create a room as the host and join from two participant windows.
2. Add a story.
3. Inspect all three voting views.

Expected:

- The host sees **Reveal estimates**.
- Neither participant sees a reveal control.
- All three clients still see voting cards before reveal.

### Test B: Reveal before everyone votes

1. Have one participant select `8`.
2. Leave the host and second participant without votes.
3. In the host window, select **Reveal estimates**.

Expected:

- Reveal succeeds without requiring every participant to vote.
- The host immediately sees the revealed state.
- Within approximately one second, participant windows show the same state.

### Test C: Display explicit results

Inspect the revealed result list in every window.

Expected:

- The voting participant's row shows `8`.
- The host and non-voting participant rows show **No vote**.
- Names and numeric participant suffixes identify every result.
- Every client displays the same values.

### Test D: Freeze voting after reveal

1. Inspect each client after reveal.
2. Attempt a direct vote request using a valid participant token.

Expected:

- Card controls are no longer displayed.
- The participant cannot change the revealed estimate through the interface.
- A direct post-reveal vote request receives HTTP `409`.
- The revealed results remain unchanged.

### Test E: Confirm reveal authorization

Send a direct reveal request using a participant token.

Expected:

- The request receives HTTP `403`.
- Only the host's bearer token can perform reveal.

## Live API smoke test

Create a room with a host and two participants, submit one vote, reveal using the host token, attempt another vote, and attempt reveal using a participant token.

Verify:

- Room status changes to `revealed`.
- The submitted vote is returned with the correct participant.
- Both non-voters receive `null` results.
- A post-reveal vote returns `409`.
- A participant reveal attempt returns `403`.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **26 passed**.
- Client automated tests: **14 passed**.
- Client production build: **passed**.
- Live API early-reveal and explicit non-voter check: **passed**.
- Live API post-reveal vote rejection: **passed** with status `409`.
- Live API participant reveal rejection: **passed** with status `403`.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 5 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–E pass in local browser sessions;
- every client converges on identical revealed results; and
- no vote can be submitted or changed after reveal.

