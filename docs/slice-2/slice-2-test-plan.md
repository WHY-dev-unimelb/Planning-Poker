# Slice 2 Test Plan: Participants Join and the Lobby Synchronizes

- **Slice:** 2 — Participants join and the lobby synchronizes
- **Status:** Accepted; automated and manual verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-2-participants-join-and-the-lobby-synchronizes)

## Test objective

Verify that participants can join an existing room, duplicate display names receive distinct identities, private tokens remain private, and every open client receives the same participant roster through polling.

## Scope

This plan covers:

- Switching between create-room and join-room flows
- `POST /api/rooms/:roomCode/participants`
- `GET /api/rooms/:roomCode`
- Room-code normalization and missing-room feedback
- Duplicate display names with unique `Name #NNN` labels
- Private participant-token generation
- Public room-state filtering
- One-second lobby polling and polling cleanup

Stories, voting, reveal, reconnection, and precise online presence are outside Slice 2.

## Prerequisites

1. Complete the Slice 1 prerequisites.
2. Start with an empty in-memory server state.
3. Have three browser windows or isolated browser sessions available for the multi-client check.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing room-creation tests continue to pass.
- A participant can join an existing room through the API.
- An unknown room code returns `404` with a useful error.
- A blank participant name returns `400` with a useful error.
- Duplicate names receive different numeric identifiers and private tokens.
- Public room state contains no private participant or host token.
- The React join flow normalizes a room code to uppercase.
- The React lobby adds a newly polled participant.
- Polling is cleared when the lobby component unmounts.
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

### Test A: Join an existing room

1. In browser window 1, create a room as `Alex`.
2. Copy the generated room code.
3. In browser window 2, choose **Join a room**.
4. Enter the room code in lowercase and enter `Sam` as the name.
5. Select **Join room**.

Expected:

- Window 2 enters the correct lobby.
- The normalized uppercase room code is displayed.
- The roster contains the host and `Sam #NNN`.
- Within approximately one second, window 1 displays the same roster.

### Test B: Allow duplicate display names

1. In browser window 3, join the same room using `Sam` again.
2. Observe the participant list in all three windows.

Expected:

- The second Sam joins successfully.
- The two Sam entries have different numeric suffixes.
- Within approximately one second, all windows display the same three-person roster.

### Test C: Reject an unknown room

1. Open a fresh browser tab.
2. Choose **Join a room**.
3. Enter a six-character code that does not exist and a valid name.
4. Select **Join room**.

Expected:

- The user remains on the join view.
- A message states that the room was not found and suggests checking the code.

### Test D: Validate response privacy

1. Open the browser's developer tools and select the Network panel.
2. Join a room and inspect the join response.
3. Inspect a later `GET /api/rooms/:roomCode` polling response.

Expected:

- The join response contains one top-level `participantToken` for the joining participant.
- The public `room.participants` objects contain no token fields.
- The polling response contains no host or participant token anywhere.

### Test E: Confirm polling stops with the client

1. Observe the repeating room-state requests in the Network panel.
2. Close the lobby tab.

Expected:

- That client makes no further room-state requests after the tab closes.

## Live API smoke test

Create a room, join it twice using the same display name, and request its public room state.

Verify:

- The room contains three participants.
- All three numeric identifiers differ.
- Both join responses contain private participant tokens.
- The public state contains no token field.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **10 passed**.
- Client automated tests: **6 passed**.
- Client production build: **passed**.
- Live API duplicate-name test: **passed** with three distinct identifiers.
- Live API token test: **passed**; join tokens were issued and public state contained no token.
- Manual browser procedure: **passed**, confirmed by the user on 13 October 2026.

## Exit criteria

Slice 2 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–E pass in local browser sessions;
- every client converges on the same participant roster; and
- no private token appears in public room-state responses.

