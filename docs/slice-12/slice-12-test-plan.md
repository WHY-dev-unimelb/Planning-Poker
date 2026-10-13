# Slice 12 Test Plan: Host Disconnection Ends the Room

- **Slice:** 12 — Host disconnection ends the room
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-12-host-disconnection-ends-the-room)

## Test objective

Verify that authenticated host activity renews a 15-second room lease, same-tab restoration within that grace period keeps the room active, and prolonged host disconnection moves every client to a clear terminal state.

## Scope

This plan covers:

- The 15-second host activity lease
- Lease renewal through host polling, host actions, and session restoration
- Participant activity that does not renew the host lease
- Lazy expiry through normal room requests
- Host-disconnected tombstone state
- Rejection of joins and actions after expiry
- Participant synchronization through polling

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing Slices 1–11 continue to pass.
- A room remains active while authenticated host polling renews its lease.
- Participant polling does not renew the host lease.
- The room ends once 15 seconds have elapsed since the last host activity.
- Host restoration at 14.999 seconds renews the lease.
- Expired rooms expose a host-disconnected reason and clear message.
- New participants cannot join an ended room.
- Votes and host actions are rejected after expiry.
- Participant polling renders the terminal room view.
- The production client build completes successfully.

## Manual browser test procedure

### Test A: Keep an active host room alive

1. Start the client and server.
2. Create a room and join from a second browser tab.
3. Leave both tabs open for at least 20 seconds.

Expected:

- The room remains active because host polling renews the lease.
- Participant polling does not show an ended state.

### Test B: Restore the host within the grace period

1. Refresh the host tab.
2. Complete restoration within 15 seconds.
3. Continue using the room for another 20 seconds.

Expected:

- The same host identity is restored.
- The lease is renewed.
- The participant remains in the active room.

### Test C: End after host disconnection

1. Close the host tab completely.
2. Keep the participant tab open.
3. Wait approximately 15–17 seconds.

Expected:

- The participant reaches **Room ended** on a polling update.
- The message says the host disconnected.
- Voting and round controls are absent.

### Test D: Reject activity after expiry

1. Attempt a direct vote request with a known participant token.
2. Attempt to join using the ended room code.

Expected:

- Both requests are rejected with a room-ended state error.
- The ended tombstone remains readable.

### Test E: Preserve room information in the ended state

Complete at least one round before disconnecting the host.

Expected:

- The ended view retains the participant roster.
- Previously revealed history remains readable.
- No private token appears in room state or history.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **49 passed** across Slices 1–13.
- Client automated tests: **25 passed** across Slices 1–13.
- Client production build: **passed**.
- Host renewal, restoration grace, expiry, tombstone, and action rejection checks: **passed**.
- Participant terminal-state rendering: **passed**.
- Manual browser procedure: **pending user confirmation**.

## Exit criteria

Slice 12 is accepted when automated verification passes and Tests A–E confirm that a connected host keeps the room active while a disconnected host ends it after the documented grace period.
