# Planning Poker Product Decision Record

- **Status:** MVP decisions implemented; extension planning started
- **Recorded:** 13 October 2026
- **Scope:** Product behaviour and boundaries for the 6–8 hour assignment MVP
- **Companion documents:** [MVP user flow](./mvp-user-flow.md) and [Extended features vertical slices](./planning-poker-extended-features-vertical-slices.md)

## 1. Rooms and participant identity

### Decision

- A host creates a room and receives a short room code.
- Participants join with the room code and a display name.
- Duplicate display names are allowed.
- Each participant receives a short numeric identifier so duplicate names can be distinguished in the interface, for example `Alex #123`.

### Consequences

- The generated identifier, rather than the display name alone, is the participant's unique identity within a room.
- Names should always be displayed with their identifier anywhere ambiguity matters, including the participant list, voting status, revealed votes, and history.
- The identifier only needs to be unique within its room and only for the lifetime of that room.

## 2. Host permissions and room lifetime

### Decision

- The host controls the current story, reveal, revote, and movement to the next story.
- Participants can vote but cannot perform host actions.
- For the MVP, rooms remain in server memory until the server restarts.
- Detecting a host disconnect and automatically ending the room is deferred until after the MVP.

### Consequences

- Host transfer is not part of the MVP.
- The MVP does not need heartbeats, presence timeouts, or automatic room cleanup.
- A host closing or refreshing the browser does not immediately delete the room.

## 3. Voting cards and custom decks

### Decision

- The MVP uses one fixed Fibonacci-style deck: `1, 2, 3, 5, 8, 13, 21, ?`.
- Additional presets and custom decks are deferred until after the MVP.
- Participants can change their vote until estimates are revealed.
- Before reveal, only voting status is visible. A participant's selected value remains hidden.

### Consequences

- The fixed deck applies consistently to all participants in the room.
- After reveal, each participant's selected card is shown.

## 4. Reveal

### Decision

- Only the host can reveal estimates.
- The host can reveal before every participant has voted.

### Consequences

- Non-voters are shown as having no vote in the revealed results.
- Automatic reveal is not supported.
- An additional early-reveal confirmation is not currently required and can be added later if usability testing shows it is useful.

## 5. Revote, next story, and round history

### Decision

- **Revote** starts a new round for the current story and clears the active votes.
- **Next story** completes the current story flow, clears the active votes, and allows the host to enter the next story.
- The MVP does not keep completed-round history. Complete history is deferred until after the MVP.

### Consequences

- Revealed results remain visible only until the host starts a revote or moves to the next story.
- Starting either action discards the previous revealed result.
- Deferring history removes additional storage, presentation, and participant-change edge cases from the MVP.

## 6. Disconnection and rejoining

### Decision

- Participants may join an existing room using its room code, including while an unrevealed round is active.
- Identity restoration and vote recovery after a disconnect or refresh are deferred until after the MVP.

### Consequences

- A participant who joins again receives a new numeric identifier, even when using the same display name.
- An unrevealed vote is not restored.
- A private participant token authorizes actions in the current browser session; the public numeric identifier is not a credential.
- The MVP does not attempt to show precise online or offline presence.

## 7. Persistence

### Decision

- All MVP room, participant, story, and active-vote data is stored in server memory.
- No application data is persisted across server restarts.

### Consequences

- A database is not required for the MVP.
- Restarting the server ends every room and deletes all history.
- The interface and README should make this limitation clear.

## 8. Primary session flow

### Decision

- The MVP uses a lobby-first, facilitator-led flow.
- The host creates and configures the room before adding the first story.
- Participants join the lobby before estimation begins.
- The host adds the first story when the group is ready, which begins the first voting round.
- After reveal, the host chooses either **Revote** for the current story or **Next story**.

### Consequences

- The product needs a distinct lobby state before the first story is active.
- Participants can confirm that they joined the correct room and see who else is present before voting starts.
- The fixed deck is available as soon as the first round begins, with no deck-configuration step.
- There is no separate ready-check or “open voting” action in the MVP. Adding a story begins voting.
- The complete flow is documented in [MVP user flow](./mvp-user-flow.md).

## Explicitly out of scope for the MVP

- User accounts and authentication
- Permanent session or round history
- Additional deck presets and custom decks
- Host transfer
- Automatic room termination when the host disconnects
- Explicit room-ending and automatic room cleanup
- Identity or vote restoration after refresh or disconnection
- Precise presence tracking
- Chat, timers, statistics, and result export
- Production-grade recovery or deployment behaviour

## Open details to settle before implementation

There are no blocking product decisions for the vertical slices. Early-reveal confirmation and explicit room-ending behavior are deferred until after the MVP.

## 9. Extended preset decks

### Decision

- Slice 8 adds three room-level deck presets:
  - Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?`
  - T-shirt: `XS, S, M, L, XL, ?`
  - Powers of two: `1, 2, 4, 8, 16, 32, ?`
- The host selects the preset while creating the room.
- Fibonacci remains the default.
- A room uses the selected deck for every story and revote.

### Consequences

- The server validates estimates against the room's selected deck rather than one global deck.
- Participants cannot change the deck.
- The selected deck cannot change after room creation.
- Hidden-vote and reveal behavior remain identical for every preset.

## 10. In-memory completed-round history

### Decision

- Every successful reveal appends an immutable round snapshot to the room history.
- A snapshot records the story number, round number, story text, participant labels and roles, and each revealed estimate or no-vote result.
- Revoting creates another numbered round for the same story.
- Moving to the next story retains all earlier snapshots and starts round one for the new story.
- Participants who join later can see all earlier revealed rounds.
- The current revealed result remains in the main results view; the history section displays earlier rounds to avoid duplication.

### Consequences

- History is shared room data rather than private per-participant data.
- Snapshot participants do not change when participants later join or submit another vote.
- Private participant tokens are never copied into history.
- History remains in memory only and disappears when the server restarts.
- An invalid repeated reveal cannot append a duplicate snapshot.

## 11. Same-tab session restoration

### Decision

- The client stores the room code and private participant token in `sessionStorage` after creating or joining a room.
- Refreshing the same tab restores the existing participant identity and role through a token-authenticated endpoint.
- During active voting, the restore response returns only the token owner's selected estimate.
- Closing the tab ends the stored browser session because `sessionStorage` is tab-scoped.
- Missing rooms and invalid tokens clear stale stored credentials and return the user to room entry with a useful message.

### Consequences

- Refresh does not create a duplicate participant.
- A host refresh retains host permissions.
- A participant refresh cannot gain host controls.
- Other participants' unrevealed estimates remain absent from public and restored room state.
- Reopening the application in a new tab requires joining again and creates a new participant identity.
- Server restart still deletes the room and makes the stored session invalid.

## 12. Host-disconnection room ending

### Decision

- Every room has a 15-second host activity lease.
- Authenticated host polling, host restoration, and host actions renew the lease.
- If the lease has expired when the room is next requested, the room transitions to `ended` with a host-disconnected reason.
- A same-tab host refresh within the grace period restores the session and renews the lease.
- Participant activity does not renew the host lease.

### Consequences

- Participant polling normally detects disconnection shortly after the 15-second grace period.
- Brief refreshes or network interruptions within the grace period do not end the room.
- Background browser throttling may affect a short demonstration lease, so a production system would use a longer duration or a realtime connection.
- No background server timers are required; expiry is evaluated lazily on room access.

## 13. Explicit and retained room ending

### Decision

- Only the host can explicitly end an active room.
- The client asks for confirmation before sending the end request.
- Ending is idempotent.
- Ended rooms remain as in-memory tombstones until server restart.
- The tombstone includes a clear reason and message for participant polling.

### Consequences

- Ended rooms reject joins, votes, and round actions.
- All connected clients reach the same terminal room view through polling.
- History and the participant roster remain readable in the ended state.
- Restarting the server removes ended tombstones with every other in-memory room.

## 14. Room identity, leaving, and remembered names

### Decision

- The room code has a copy control with visible success or failure feedback.
- The current participant has a green **You** badge, distinct from the blue **Host** badge.
- A participant who leaves is removed immediately from the active roster and any active vote is deleted.
- Revealed history remains immutable when a participant leaves.
- While a room is active, the host sees only the confirmed **End room** action because leaving and ending have the same effect; participants see **Leave room**. Once the room is ended, the host sees **Leave room** to return home.
- Every successful leave clears the tab's `sessionStorage` room credentials and returns to room entry.
- The display name is stored separately in `localStorage` and reused across tabs, refreshes, and room exits.
- Rejoining after leaving creates a new participant identifier and session.

### Consequences

- The server returns the current participant's public identifier in create, join, and restore session responses so the client can label the correct row.
- A departed participant's old active-room token is invalid and cannot restore that identity.
- Name storage is only a convenience and grants no room permissions.
- Room credentials remain tab-scoped and are never moved into `localStorage`.
- The active host does not receive a duplicate **Leave room** control; the ended host can still exit the terminal view.

