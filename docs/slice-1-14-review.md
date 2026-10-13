# Slice 1 ~ 14 Review

- **Review date:** 13 October 2026
- **Scope:** Planning Poker implementation across Slices 1–14
- **Review type:** Read-only defect, security, logic, and reliability review
- **Resolution status:** All five actionable findings were fixed on 13 October 2026.
- **Overall result:** Core behavior remains well covered, and the reviewed reliability, validation, capacity, and usability gaps are resolved.

## Verification performed

- Client tests: **33 passed**.
- Server tests: **59 passed**.
- Client production build: **passed**.
- Git diff validation: **passed** with no whitespace errors.
- Production dependency vulnerability audit: **not completed** because registry access was unavailable without exporting repository dependency metadata.

## Findings

### P2 — Enforce text-length limits on the server

**Status:** Resolved.

**Location:** `server/src/rooms.js:70–96`

The server trims names and story text and rejects blank values, but it does not enforce the 60-character name and 500-character story limits used by the client. These browser controls can be bypassed by calling the API directly.

Oversized values are retained in room memory and repeatedly serialized in polling responses and history. For example, two 60 KB names produce a room response of approximately 240 KB because each name is retained in both `name` and `label`.

**Resolution:** The server now enforces 60-character names and 500-character stories through exported shared limits. Oversized values produce `RoomValidationError`, and both room-store and API regression tests bypass the client to verify enforcement.

### P2 — Cap room participation before exhausting identifiers and response size

**Status:** Resolved.

**Location:** `server/src/rooms.js:163–172`

Every successful join appends another participant without enforcing a room capacity. Participant identifiers have only 900 possible values (`100` through `999`), so a sufficiently full room eventually fails to generate another identifier and returns a generic HTTP 500 response.

Before identifier exhaustion, every polling response also grows with the participant list. A buggy or malicious client with the shared room code can therefore make the room increasingly expensive for every connected client.

**Resolution:** Rooms now support at most 100 participants, including the host. Further joins return a specific room-full conflict response, with room-store and API coverage for the boundary.

### P2 — Make session-storage failure handling non-throwing

**Status:** Resolved.

**Location:** `client/src/App.jsx:701–736`

`readStoredSession` attempts to recover when `sessionStorage.getItem` throws, but its catch block calls `clearStoredSession`, whose `removeItem` call is not protected. If browser storage is unavailable, the recovery path throws again and can prevent the application from rendering.

The unprotected `setItem` and `removeItem` operations can also interfere with otherwise successful create, join, leave, and invalid-session recovery flows. In particular, a successful server-side leave can leave the client stuck in the room view if local credential removal throws.

**Resolution:** Session reads, writes, and removals now tolerate browser storage exceptions. The active tab continues operating, local UI cleanup proceeds after leave, and regression tests cover blocked storage access.

### P2 — Prevent overlapping polling requests

**Status:** Resolved.

**Location:** `client/src/App.jsx:113–164`

The polling interval starts a new asynchronous request every second without waiting for the previous request to finish. On a slow or stalled connection, requests can accumulate. Responses can also arrive out of order and temporarily replace newer participant or voting state with an older snapshot.

**Resolution:** Polling is now scheduled only after the preceding request settles. In-flight requests are aborted during cleanup, and mutation-version checks prevent older poll responses from overwriting state produced by room actions.

### P3 — Reset copy-success feedback

**Status:** Resolved.

**Location:** `client/src/App.jsx:360–374` and `client/src/App.jsx:450–452`

After a successful copy, `copyStatus` remains set to `Copied` for the rest of the room session. The button therefore displays **Copied!** permanently rather than providing the brief confirmation described by the Slice 14 documentation.

**Resolution:** Copy success now resets after two seconds, and its timer is cleared when the component unmounts or the user leaves the room.

## Strengths observed

- Participant tokens are excluded from public room state and completed-round history.
- Unrevealed vote values remain private while voting is active.
- Host-only operations are enforced by the server rather than only by client controls.
- Completed-round history is copied into immutable public snapshots.
- Participant leave removes the participant and active vote while retaining completed history.
- Room lifecycle behavior, session restoration, deck validation, voting, reveal, revote, and next-story behavior all have focused automated coverage.

## Resolution summary

1. Added server-side input limits and participant capacity controls.
2. Made session-storage helpers safe when browser storage is unavailable.
3. Replaced overlapping interval polling with sequential, cancellable polling and stale-response protection.
4. Made the copy-success message temporary.
5. Added regression coverage and reran the full client, server, and production-build checks.

## Final assessment

Slices 1–14 form a coherent and functional Planning Poker flow. The follow-up fixes close every actionable issue identified in this review, including direct-API validation, room-capacity exhaustion, restricted browser storage, overlapping polling, stale polling responses, and persistent copy feedback. The remaining dependency-audit limitation is recorded above and was not a source-code finding.
