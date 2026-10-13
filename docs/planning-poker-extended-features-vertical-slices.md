# Planning Poker Extended Features Vertical Slices

- **Status:** Proposed implementation sequence
- **Recorded:** 13 October 2026
- **Starting point:** Core product MVP Slices 1–7 accepted
- **Architecture:** React client, Express HTTP API, in-memory server state, short-interval polling
- **Related documents:** [Product decisions](./product-decisions.md), [MVP user flow](./mvp-user-flow.md), and [MVP vertical slices](./mvp-vertical-slices.md)

## Goal and time boundary

Use the remaining assignment time to add one demonstrable extension without weakening the tested MVP. Each extension remains a small vertical slice with a user-visible outcome, server rules, API behavior, client behavior, and focused tests.

With approximately two hours remaining, the current sequence is:

1. Complete the MVP handoff gate in the [MVP plan](./mvp-vertical-slices.md#mvp-handoff-gate-reviewer-can-run-and-verify-the-mvp), especially the README and clean-run instructions.
2. Complete Slice 8 manual acceptance.
3. Begin Slice 9 only if Slice 8 is accepted and enough time remains for automated and manual verification.

Do not begin history, reconnection, or presence work during the assignment unless the earlier work is complete. Those features change room data ownership and lifecycle rules and are more likely to leave the application partially working.

## Planning assumptions

- Extension data remains in memory and disappears when the server restarts.
- The host continues to control room configuration.
- A room's deck is fixed once voting for the first story begins.
- Vote values remain hidden before reveal for every deck type.
- Existing rooms and fixed-deck behavior continue to work without migration.
- Each slice receives its own test-plan document when implementation starts.

## Slice 8: Host chooses a preset deck

**Status:** Implemented; automated checks passed, manual browser acceptance pending.

### Testable user outcome

Before starting the first story, the host chooses from a small list of deck presets, and every participant votes using the selected deck.

### Main files or areas involved

- Room-creation or lobby configuration in React
- Deck preset definitions shared or mirrored across client and server
- Room creation/configuration API payload
- In-memory room deck state
- Vote validation against the room's selected deck
- Public room-state serialization and card rendering

### Acceptance checks

- The host can choose one preset before voting begins.
- The existing Fibonacci deck remains the default.
- The selected preset is stored on the room and shown consistently to all clients.
- Vote validation uses the room's deck rather than a global fixed deck.
- A value from another preset is rejected.
- Participants cannot change the room deck.
- The deck cannot change after the first story starts.
- Pre-reveal responses still expose voting status but never selected values.

### Tests to run

- Room-rule test: new rooms use the default preset when none is supplied.
- Room-rule test: a supported preset produces its expected cards.
- API test: an unknown preset is rejected.
- Authorization/state test: participants and active rooms cannot change decks.
- Vote test: only values from the selected room deck are accepted.
- Privacy regression test: selected values remain absent before reveal.
- React test: choosing a preset changes the cards shown when voting starts.
- Manual check: create two rooms with different presets and verify each room's participants see the correct cards.

### Selected presets

Confirmed on 13 October 2026:

- Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?`
- T-shirt: `XS, S, M, L, XL, ?`
- Powers of two: `1, 2, 4, 8, 16, 32, ?`

### Why this is first

It delivers visible user value while preserving the current state machine, polling model, privacy rules, and in-memory architecture. It is substantially lower risk than history or reconnection.

## Slice 9: Host creates a custom deck

**Status:** Planned after Slice 8.

### Testable user outcome

Before the first story, the host enters a custom ordered set of card labels and the room uses those cards for every round.

### Main files or areas involved

- Custom-deck entry and preview
- Deck parsing, normalization, and validation
- Room configuration API and in-memory state
- Dynamic server-side vote validation
- Card layout for varying label lengths and deck sizes

### Acceptance checks

- Only the host can define a custom deck.
- Blank labels are removed and surrounding whitespace is trimmed.
- Duplicate labels are rejected or normalized according to one documented rule.
- Minimum and maximum card counts and label lengths are enforced.
- The order entered by the host is preserved.
- The deck locks when the first story starts.
- All clients see the same custom cards.
- Hidden-vote privacy remains unchanged.

### Tests to run

- Parser tests for trimming, blanks, duplicates, order, and limits.
- API validation tests for malformed and oversized decks.
- Authorization and deck-lock tests.
- Vote validation against custom labels.
- React entry, preview, and validation tests.
- Layout check using short and long card labels.
- Manual multi-client custom-deck voting and reveal.

### Open decisions before implementation

- Input style: comma-separated labels or one label per line.
- Limits: recommended 2–20 cards and 1–12 characters per label.
- Duplicate rule: recommended rejection with a clear validation message.

## Slice 10: Room keeps completed-round history

**Status:** Planned; not recommended within the remaining assignment time.

### Testable user outcome

Participants can review every revealed round for the current in-memory room, including revotes and completed stories.

### Main files or areas involved

- Completed-round data model
- Snapshot creation at reveal
- History serialization and display
- Rules for revote and next-story entries
- Participant-label retention for past rounds

### Acceptance checks

- Reveal appends an immutable round snapshot.
- A revote creates another round for the same story rather than overwriting history.
- Next story preserves earlier rounds.
- Each snapshot contains the story, round number, participant labels, and revealed result or no-vote marker.
- History contains no private tokens.
- History disappears when the server restarts.

### Tests to run

- Room-rule tests for reveal, revote, and next-story history ordering.
- Immutability test: later participant or vote changes do not alter old snapshots.
- Privacy test: serialized history contains no credentials.
- React test for multiple stories and revotes.
- Manual history check across multiple clients.

### Open decisions before implementation

- Whether a participant who joins later can see all earlier rounds; recommended yes for a shared room record.
- Whether repeated reveals are prevented or treated idempotently; recommended prevent invalid state transitions as today.

## Slice 11: Participant rejoins the same browser session

**Status:** Planned; requires a security and lifecycle decision.

### Testable user outcome

After refreshing or briefly disconnecting, a participant returns to the same identity and recovers their unrevealed selection in the same browser.

### Main files or areas involved

- Session token storage in the browser
- Token-authenticated rejoin endpoint
- Private current-user vote response
- Polling and room-unavailable recovery
- Token cleanup when a room ends or becomes unavailable

### Acceptance checks

- Refresh restores the same participant identifier rather than creating a duplicate.
- An unrevealed vote is restored only to its owner.
- Other clients still cannot see the vote value before reveal.
- Invalid, expired, or wrong-room tokens cannot restore a session.
- A server restart produces a clear room-unavailable state and clears stale local session data.

### Tests to run

- Token restoration and invalid-token API tests.
- Critical privacy tests for owner and non-owner responses.
- React refresh/recovery tests using browser storage.
- Server-restart stale-session test.
- Manual refresh before and after reveal.

### Open decision before implementation

Choose browser storage. `sessionStorage` is safer and tab-scoped; `localStorage` survives browser restarts but increases stale-token behavior. The recommended starting point is `sessionStorage`.

## Slice 12: Host disconnection ends the room

**Status:** Planned; high risk with HTTP polling.

### Testable user outcome

When the host is no longer connected, participants receive a clear room-ended message and cannot continue voting.

### Main files or areas involved

- Presence heartbeat or lease timestamps
- Host timeout and room lifecycle rules
- Room-ended API response
- Client end-state handling
- Timer-dependent server tests

### Acceptance checks

- Active host polling or heartbeat renews the room lease.
- Closing the host client ends the room after a documented grace period.
- Temporary network delay within the grace period does not end the room.
- Participants see a clear ended-room state.
- Ended rooms reject votes and host actions.
- Timers are cleaned up and do not leak between rooms.

### Tests to run

- Fake-timer tests for lease renewal, grace period, and expiry.
- API tests for actions after room termination.
- React room-ended state test.
- Multi-client manual disconnect and timeout check.

### Open decisions before implementation

- Grace period length; recommended 10–15 seconds for a demonstration, longer in a real product.
- Whether refresh within the grace period restores the host; this depends on Slice 11 session restoration.

## Slice 13: Host explicitly ends a room

**Status:** Planned after session restoration and lifecycle rules are settled.

### Testable user outcome

The host explicitly ends a room and every participant sees that the session has finished.

### Main files or areas involved

- Host-only end-room endpoint
- Ended-room state or removal policy
- Client confirmation and finished-session view
- In-memory cleanup policy

### Acceptance checks

- Only the host can end the room.
- Ending requires an explicit confirmation in the client.
- Participants see the ended state on their next poll.
- No further votes or round actions are accepted.
- The implementation has a documented choice between immediate deletion and a short-lived tombstone.

### Tests to run

- Host authorization and idempotency tests.
- State tests for all actions after room end.
- React confirmation and ended-state tests.
- Manual multi-client room-ending check.

## Priority and stopping rule

| Priority | Slice | Value | Delivery risk | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | 8 — Preset decks | High and visible | Low–medium | Implemented; complete manual acceptance |
| 2 | 9 — Custom deck | High but validation-heavy | Medium | Attempt only if Slice 8 is accepted early |
| 3 | 10 — Round history | Useful facilitation record | Medium–high | Defer beyond the assignment |
| 4 | 11 — Session rejoin | Strong reliability benefit | High | Defer; privacy-sensitive |
| 5 | 13 — Explicit room end | Moderate lifecycle clarity | Medium | Defer until room lifecycle is designed |
| 6 | 12 — Host disconnect | Matches the original decision | Very high | Defer; polling makes this timing-sensitive |

Stop adding features when fewer than 30 minutes remain. Reserve that time for the full regression suite, production build, README verification, and a clean multi-client demonstration.

## Suggested commit boundaries

8. `feat: choose a preset estimation deck`
9. `feat: configure a custom estimation deck`
10. `feat: retain in-memory round history`
11. `feat: restore participant sessions after refresh`
12. `feat: end rooms after host disconnection`
13. `feat: let hosts explicitly end rooms`
