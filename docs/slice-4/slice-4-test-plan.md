# Slice 4 Test Plan: Participants Vote Privately

- **Slice:** 4 — Participants vote privately
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-4-participants-vote-privately)

## Test objective

Verify that every room member can select or change a valid Planning Poker card while other clients see only voted/not-voted status and never receive the selected estimate before reveal.

## Scope

This plan covers:

- Fixed deck: `1, 2, 3, 5, 8, 13, 21, ?`
- Token-authorized `PUT /api/rooms/:roomCode/vote`
- Initial vote submission and vote replacement
- Server-side card validation
- Voted/not-voted status in public room state
- Pre-reveal vote privacy
- Voting-status synchronization through polling
- Local visual feedback for the current user's selected card

Reveal and post-reveal vote display are outside Slice 4 and begin in Slice 5.

## Prerequisites

1. Complete the Slice 1–3 prerequisites.
2. Create a room with at least one participant.
3. Add a story so the room is in the voting state.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slice 1–3 tests continue to pass.
- The server accepts every value in the fixed deck.
- A later vote replaces the same participant's earlier vote.
- Values outside the fixed deck receive `400`.
- Missing or invalid participant tokens receive `403`.
- Vote submission requires no public participant identifier.
- Pre-reveal room state contains `hasVoted` but no vote-value field or internal vote collection.
- Private host and participant tokens remain absent from public room state.
- React displays the fixed deck and marks only the current local selection.
- React allows a participant to select a different card.
- Polling updates other participants' voted/not-voted status.
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

### Test A: Display the fixed deck

1. Create and join a room in separate browser windows.
2. Have the host add a story.
3. Inspect the cards in both windows.

Expected:

- Both clients display exactly `1, 2, 3, 5, 8, 13, 21, ?`.
- No custom-deck controls are present.
- Every participant initially has **Not voted** status.

### Test B: Submit a private vote

1. In the participant window, select `3`.
2. Observe both the participant and host windows.

Expected:

- The participant sees `3` as their local selection.
- The participant's roster status changes to **Voted**.
- Within approximately one second, the host sees that the participant voted.
- The host does not see which card the participant selected.

### Test C: Change a vote

1. In the same participant window, select `8`.

Expected:

- `8` becomes the selected card and `3` is no longer selected.
- The participant remains marked **Voted** in every window.
- No second participant entry or extra status marker is created.

### Test D: Vote as the host

1. In the host window, select any card.

Expected:

- The host can vote using the same deck.
- The host's roster entry changes to **Voted**.
- Participants see the host's voting status but not the selected value.

### Test E: Inspect pre-reveal privacy

1. Open the Network panel in a browser that did not submit the participant's vote.
2. Inspect a polling response from `GET /api/rooms/:roomCode`.
3. Inspect a successful vote response.

Expected:

- The fixed deck is present.
- Participant entries contain `hasVoted` booleans.
- No participant entry contains a `vote`, `selectedVote`, or similar value field.
- There is no internal `votes` collection.
- There are no private token fields.

### Test F: Reject invalid voting requests

Send direct API requests using an invalid card and an invalid bearer token.

Expected:

- An invalid card receives HTTP `400`.
- An invalid participant token receives HTTP `403`.
- Neither request changes public voting status.

## Live API smoke test

Create a room, join a participant, start voting, submit `3`, replace it with `8`, and request public room state.

Verify:

- The participant is marked `hasVoted: true`.
- Public room state contains no vote-value field and no token.
- The deck exactly matches the fixed Fibonacci-style values.
- An invalid card returns `400`.
- An invalid token returns `403`.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **21 passed**.
- Client automated tests: **12 passed**.
- Client production build: **passed**.
- Live API vote submission and replacement: **passed**.
- Live API pre-reveal privacy check: **passed**; no vote field or token was present.
- Live API invalid-card check: **passed** with status `400`.
- Live API invalid-token check: **passed** with status `403`.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 4 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- every client converges on the same voted/not-voted status; and
- no selected value is exposed through public pre-reveal room state.

