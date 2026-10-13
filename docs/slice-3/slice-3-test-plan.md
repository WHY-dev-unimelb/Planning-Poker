# Slice 3 Test Plan: Host Adds the First Story

- **Slice:** 3 — Host adds the first story
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-3-host-adds-the-first-story)

## Test objective

Verify that only the host can add the first story, that adding it immediately changes the room from lobby to voting, and that current and late-joining participants receive the same active story.

## Scope

This plan covers:

- Host-only story entry in the lobby
- Bearer-token authorization for the host action
- `POST /api/rooms/:roomCode/story`
- Lobby-to-voting state transition
- Current-story publication through room polling
- Waiting behavior for participants while the room remains in the lobby
- Late joining while a story is active
- Prevention of blank or replacement stories

Card selection and vote submission are outside Slice 3 and begin in Slice 4.

## Prerequisites

1. Complete the Slice 1 and Slice 2 prerequisites.
2. Start with an empty in-memory server state.
3. Have a host browser window and at least one participant window available.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slice 1 and Slice 2 tests continue to pass.
- A valid host token can add a trimmed story.
- Adding a story changes the room status from `lobby` to `voting`.
- The public room state contains the active story.
- Participant and invalid tokens receive `403` when attempting to add a story.
- Blank story text receives `400`.
- A second story cannot replace an already active story.
- A late joiner receives the active story in the join response.
- The host React flow displays the story after starting voting.
- A participant in the lobby sees a waiting message and no story-entry controls.
- A participant receives the active story through polling.
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

### Test A: Participant waits in the lobby

1. Create a room as the host.
2. Join the room from a second browser window.

Expected:

- The host sees the story-entry control.
- The participant sees a message that they are waiting for the host.
- The participant does not see a story-entry control.

### Test B: Reject a blank story

1. In the host window, leave the story empty or enter whitespace.
2. Select **Add story and start voting**.

Expected:

- The room remains in the lobby.
- A useful message asks the host to enter a story.
- The participant window remains in the waiting state.

### Test C: Start voting with a story

1. In the host window, enter `  Estimate login flow  `.
2. Select **Add story and start voting**.

Expected:

- The host immediately sees **Voting has started**.
- The displayed story is `Estimate login flow` without surrounding whitespace.
- Within approximately one second, the participant sees the same voting state and story.
- There is no separate ready or open-voting action.

### Test D: Prevent story replacement

1. After voting starts, inspect the host view.

Expected:

- The story-entry control is no longer available.
- The active story remains unchanged.

### Test E: Join during voting

1. Open a third browser window after the story is active.
2. Join using the same room code and a new display name.

Expected:

- The late participant joins successfully.
- The late participant immediately sees the active story and voting state.
- All existing clients receive the updated participant list through polling.

### Test F: Confirm host authorization

1. Inspect the story request in the browser Network panel.
2. Confirm that it carries the host's bearer token.
3. Confirm that no participant-facing control offers the same action.

Expected:

- The authorized host request succeeds.
- Public room-state polling responses still contain no private tokens.
- Direct participant or invalid-token requests to the story endpoint receive `403`.

## Live API smoke test

Create a room, join a participant, add a story using the host token, join a late participant, and attempt to add another story using the first participant's token.

Verify:

- The host request changes the room status to `voting`.
- Story text is trimmed and returned in public room state.
- The late join response contains the active story.
- The participant attempt returns `403`.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **16 passed**.
- Client automated tests: **10 passed**.
- Client production build: **passed**.
- Live API host story transition: **passed**.
- Live API late-join story synchronization: **passed**.
- Live API participant authorization rejection: **passed** with status `403`.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 3 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- every client converges on the same voting state and story; and
- only the host can create the first active story.

