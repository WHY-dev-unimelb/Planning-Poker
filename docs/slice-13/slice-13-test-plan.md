# Slice 13 Test Plan: Host Explicitly Ends the Room

- **Slice:** 13 — Host explicitly ends a room
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-13-host-explicitly-ends-a-room)

## Test objective

Verify that only the host can deliberately end a room after confirmation, all clients receive the same retained terminal state, and no further room activity is accepted.

## Scope

This plan covers:

- Host-only explicit room ending
- Client confirmation before ending
- Cancellation without a state change
- Idempotent end requests
- Host-ended tombstone state
- Multi-client polling synchronization
- Rejection of post-end joins and actions

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slices 1–12 continue to pass.
- A participant token receives `403` when attempting to end the room.
- A host token ends the room from an active state.
- Repeating the host request succeeds without changing the original ended state.
- The tombstone contains the host-ended reason and message.
- Votes and other room actions receive a state error after ending.
- Cancelling the browser confirmation sends no request.
- Confirming sends the authenticated end request and renders **Room ended**.
- Participants receive the ended state through polling without an end control.
- The production client build completes successfully.

## Manual browser test procedure

### Test A: Show the control only to the host

1. Create a room and join from another browser tab.
2. Inspect the lobby, voting, and revealed states.

Expected:

- The host sees **End room** in each active state.
- Participants never see **End room**.

### Test B: Cancel ending

1. Select **End room** as the host.
2. Cancel the confirmation.

Expected:

- The room remains active.
- No participant view changes.
- No end request is sent.

### Test C: Confirm ending

1. Select **End room** again.
2. Confirm the action.

Expected:

- The host immediately reaches **Room ended**.
- The message says the host ended the room.
- Participant tabs reach the same state on their next poll.
- No host or voting controls remain.

### Test D: Reject activity after ending

Attempt to join, vote, reveal, revote, or start another story using direct requests.

Expected:

- Joins and all room actions are rejected.
- The tombstone is still returned by room-state requests.

### Test E: Confirm idempotency and lifetime

1. Send the authenticated host end request again.
2. Restart the server and request the old room code.

Expected:

- Repeating the end request returns the same ended state.
- Server restart removes the tombstone and the old room returns `404`.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **49 passed** across Slices 1–13.
- Client automated tests: **25 passed** across Slices 1–13.
- Client production build: **passed**.
- Host authorization, participant rejection, idempotency, and post-end action checks: **passed**.
- Confirmation, cancellation, host terminal view, and participant polling checks: **passed**.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 13 is accepted when automated verification passes and Tests A–E confirm that explicit ending is host-only, deliberate, synchronized, terminal, and retained until server restart.
