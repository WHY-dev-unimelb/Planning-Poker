# Slice 1 ~ 14 Review

- **Review date:** 13 October 2026
- **Scope:** Planning Poker implementation across Slices 1–14
- **Review type:** Read-only defect, security, logic, and reliability review
- **Overall result:** Core behavior is well covered and the automated suites pass, but four medium-priority reliability/security issues and one low-priority usability issue should be addressed.

## Verification performed

- Client tests: **29 passed**.
- Server tests: **53 passed**.
- Client production build: **passed**.
- Git diff validation: **passed** with no whitespace errors.
- Production dependency vulnerability audit: **not completed** because registry access was unavailable without exporting repository dependency metadata.

## Findings

### P2 — Enforce text-length limits on the server

**Location:** `server/src/rooms.js:67`, `server/src/rooms.js:199`, and `server/src/rooms.js:327`

The server trims names and story text and rejects blank values, but it does not enforce the 60-character name and 500-character story limits used by the client. These browser controls can be bypassed by calling the API directly.

Oversized values are retained in room memory and repeatedly serialized in polling responses and history. For example, two 60 KB names produce a room response of approximately 240 KB because each name is retained in both `name` and `label`.

**Suggested fix:** Define shared server-side maximum lengths for names and stories. Reject oversized input with `RoomValidationError` before storing it, and add API and room-store tests that bypass the client controls.

### P2 — Cap room participation before exhausting identifiers and response size

**Location:** `server/src/rooms.js:145–146`

Every successful join appends another participant without enforcing a room capacity. Participant identifiers have only 900 possible values (`100` through `999`), so a sufficiently full room eventually fails to generate another identifier and returns a generic HTTP 500 response.

Before identifier exhaustion, every polling response also grows with the participant list. A buggy or malicious client with the shared room code can therefore make the room increasingly expensive for every connected client.

**Suggested fix:** Add a documented maximum participant count and reject additional joins with a specific validation or conflict response. Add tests for the final allowed participant and the first rejected participant.

### P2 — Make session-storage failure handling non-throwing

**Location:** `client/src/App.jsx:664–690`

`readStoredSession` attempts to recover when `sessionStorage.getItem` throws, but its catch block calls `clearStoredSession`, whose `removeItem` call is not protected. If browser storage is unavailable, the recovery path throws again and can prevent the application from rendering.

The unprotected `setItem` and `removeItem` operations can also interfere with otherwise successful create, join, leave, and invalid-session recovery flows. In particular, a successful server-side leave can leave the client stuck in the room view if local credential removal throws.

**Suggested fix:** Make all session-storage helpers catch storage exceptions. Local UI cleanup should continue even when credentials cannot be persisted or removed. Add client tests with `getItem`, `setItem`, and `removeItem` configured to throw.

### P2 — Prevent overlapping polling requests

**Location:** `client/src/App.jsx:110–140`

The polling interval starts a new asynchronous request every second without waiting for the previous request to finish. On a slow or stalled connection, requests can accumulate. Responses can also arrive out of order and temporarily replace newer participant or voting state with an older snapshot.

**Suggested fix:** Schedule the next poll only after the current request settles. Abort an in-flight request during effect cleanup and, as an additional safeguard, ignore responses older than the most recently applied request sequence.

### P3 — Reset copy-success feedback

**Location:** `client/src/App.jsx:330–335` and `client/src/App.jsx:413–415`

After a successful copy, `copyStatus` remains set to `Copied` for the rest of the room session. The button therefore displays **Copied!** permanently rather than providing the brief confirmation described by the Slice 14 documentation.

**Suggested fix:** Reset the success state after a short timeout and clear the timer when the component unmounts or the user leaves the room.

## Strengths observed

- Participant tokens are excluded from public room state and completed-round history.
- Unrevealed vote values remain private while voting is active.
- Host-only operations are enforced by the server rather than only by client controls.
- Completed-round history is copied into immutable public snapshots.
- Participant leave removes the participant and active vote while retaining completed history.
- Room lifecycle behavior, session restoration, deck validation, voting, reveal, revote, and next-story behavior all have focused automated coverage.

## Recommended order of work

1. Add server-side input limits and participant capacity controls.
2. Make session-storage helpers safe when browser storage is unavailable.
3. Replace interval-based polling with non-overlapping, cancellable polling.
4. Reset the copy-success message after a short delay.
5. Add regression tests for each failure mode above and run the full client, server, and production-build checks again.

## Final assessment

Slices 1–14 form a coherent and functional Planning Poker flow, and the existing automated tests provide good coverage of the expected user journey. The findings above do not invalidate the demonstrated core behavior, but the P2 items should be resolved before treating the application as robust against direct API use, unusually large rooms, restricted browser storage, or unreliable networks.
