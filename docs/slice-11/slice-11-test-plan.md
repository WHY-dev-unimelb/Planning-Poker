# Slice 11 Test Plan: Participant Restores the Same-Tab Session

- **Slice:** 11 — Participant rejoins the same browser session
- **Status:** Accepted; automated and manual verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-11-participant-rejoins-the-same-browser-session)

## Test objective

Verify that refreshing the same browser tab restores the participant's identity, role, room state, and private active selection without exposing another participant's unrevealed estimate or creating a duplicate participant.

## Scope

This plan covers:

- Room code and private token storage in `sessionStorage`
- Token-authenticated session restoration
- Host and participant role restoration
- Owner-only active-vote recovery
- Invalid-token and missing-room handling
- Stale-session cleanup after server restart
- Polling detection of a room that becomes unavailable
- Tab-scoped session lifetime

Cross-tab restoration and persistence after closing the tab remain out of scope.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing MVP, preset-deck, and history tests continue to pass.
- Creating or joining stores only the room code and private participant token in `sessionStorage`.
- A valid token restores the same participant role.
- During voting, restoration returns only the token owner's selected estimate.
- Public participant state still contains voting status but no estimate values.
- An invalid token receives `403`.
- A missing room receives `404`.
- A stale stored session is cleared and room entry is shown with a useful message.
- React restores the selected card after refresh.
- Participant restoration does not display host-only controls.
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

### Test A: Restore the host after refresh

1. Create a room as the host.
2. Record the host's full label and participant count.
3. Refresh the same tab.

Expected:

- The application briefly indicates that it is restoring the room.
- The same room and host label return.
- The participant count does not increase.
- Host-only story, reveal, revote, or next-story controls remain available when appropriate.

### Test B: Restore a participant without gaining host permissions

1. Join the room in a second browser tab as a participant.
2. Record the participant's full label.
3. Refresh that tab.

Expected:

- The same participant label returns without a duplicate roster entry.
- The participant does not receive host-only controls.

### Test C: Restore an unrevealed selection privately

1. Start a voting round.
2. Select different cards as host and participant.
3. Refresh the participant tab before reveal.

Expected:

- The participant's own card remains selected after restoration.
- The participant's **Your selection** message contains their original value.
- The host's unrevealed value is not visible.
- Other clients still see only **Voted** status.

### Test D: Reset restored selection on revote

1. Reveal the round.
2. Start a revote.
3. Refresh the participant tab.

Expected:

- The same participant identity returns.
- No card is selected because the revote cleared active votes.
- Earlier revealed results remain available through history.

### Test E: Clear an invalid or stale session

1. Create or join a room, then stop and restart the server.
2. Refresh the browser tab.

Expected:

- The old room is not restored.
- Stored credentials are removed.
- Room entry is shown with a message explaining that the previous room is unavailable.

Repeat using a deliberately altered participant token in browser session storage.

Expected:

- Restoration is rejected.
- The invalid credentials are removed.
- The user is asked to join again.

### Test F: Confirm tab-scoped lifetime

1. Join a room in one tab and confirm refresh restoration works.
2. Close that tab completely.
3. Open the application in a new tab.

Expected:

- The closed tab's credentials are not restored in the new tab.
- The application shows room entry.
- Joining again creates a new numeric participant identifier, as documented.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **44 passed**.
- Client automated tests: **22 passed**.
- Client production build: **passed**.
- Token-owner role and private-vote restoration checks: **passed**.
- Invalid-token and missing-room API checks: **passed**.
- Client same-tab restoration and stale-session cleanup checks: **passed**.
- Existing pre-reveal privacy regression tests: **passed**.
- Manual browser procedure: **passed; confirmed by the user on 13 October 2026**.

## Exit criteria

Slice 11 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- refresh creates no duplicate participant; and
- restoration exposes no other participant's unrevealed estimate.
