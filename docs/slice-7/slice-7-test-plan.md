# Slice 7 Test Plan: Host Moves to the Next Story

- **Slice:** 7 — Host moves to the next story
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](../mvp-vertical-slices.md#slice-7-host-moves-to-the-next-story)

## Test objective

Verify that, after reveal, the host can replace the current story and start a clean voting round while discarding the previous votes and revealed result.

## Scope

This plan covers:

- Host-authorized `POST /api/rooms/:roomCode/next-story`
- Revealed-to-voting state transition
- Validation of the next story text
- Replacement of the current story
- Complete vote and revealed-result reset
- Host next-story controls and participant read-only behavior
- Next-story synchronization through polling
- Fresh vote submission for the replacement story

Round history and persistent storage remain outside the MVP.

## Prerequisites

1. Complete the Slice 1–6 prerequisites.
2. Start the client and server.
3. Create a room with a host and at least one participant.
4. Complete and reveal a vote for the first story.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slice 1–6 tests continue to pass.
- A valid host token starts the next story after reveal.
- Starting the next story before reveal receives `409`.
- A participant token receives `403` when attempting the action.
- Blank or whitespace-only next-story text is rejected with `400`.
- The submitted story is trimmed and replaces the previous story.
- Every server-side vote and voting-status marker is cleared.
- No revealed `vote` property remains in public room state.
- A participant can submit a fresh vote for the replacement story.
- React removes the previous results and shows clean voting cards.
- Participants never receive next-story controls.
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

### Test A: Show next-story controls only to the host after reveal

1. Create a room in one browser window and join it in another.
2. Add the first story and inspect both voting views.
3. Reveal the first round and inspect both result views.

Expected:

- **Next story** and **Start next story** are absent before reveal.
- After reveal, only the host sees the next-story entry and action.
- The participant sees the revealed result but no next-story controls.
- **Revote** remains a separate host action.

### Test B: Reject an empty next story

1. In the revealed host view, leave **Next story** blank or enter spaces.
2. Select **Start next story**.

Expected:

- A clear validation message asks for the next story.
- The first story and its revealed result remain unchanged.
- No network request starts a new round.

### Test C: Start a clean round for a replacement story

1. Enter a different story in **Next story**.
2. Select **Start next story**.

Expected:

- The host immediately returns to the voting-card view.
- Within approximately one second, participant windows also return to voting.
- Every window shows the second story instead of the first.
- The previous results list disappears.
- No card is selected and every participant is marked **Not voted**.

### Test D: Confirm there is no round history

Inspect the host and participant views after starting the second story.

Expected:

- The first story's revealed estimates cannot be viewed.
- There is no history list or previous-round summary.
- Only the active second story remains.

### Test E: Vote on the replacement story

1. Have the participant select a card for the second story.
2. Have the host select a card.
3. Reveal the second round.

Expected:

- Both fresh votes succeed.
- Voted/not-voted status updates through polling.
- The revealed results contain only estimates submitted for the second story.

### Test F: Confirm authorization and state rules

Send direct next-story requests before reveal and with a participant token.

Expected:

- A host request before reveal receives HTTP `409`.
- A participant request after reveal receives HTTP `403`.
- Neither invalid request changes the room state.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **37 passed**.
- Client automated tests: **17 passed**.
- Client production build: **passed**.
- Server next-story transition, clearing, validation, state, and authorization checks: **passed**.
- Client story replacement, clean voting state, participant control visibility, and blank validation checks: **passed**.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 7 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- every client shows the same replacement story in a clean voting state; and
- no previous estimate or result remains accessible.
