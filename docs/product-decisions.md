# Planning Poker Product Decision Record

- **Status:** Accepted for MVP planning
- **Recorded:** 13 October 2026
- **Scope:** Product behaviour and boundaries for the 6–8 hour assignment MVP
- **Companion document:** [MVP user flow](./mvp-user-flow.md)

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
- The room ends when the host disconnects.

### Consequences

- Ending the room removes its in-memory state, including participants, the active round, and round history.
- Connected participants should be told that the room ended because the host disconnected.
- Host transfer is not part of the MVP.
- The application will need a defined way to detect disconnection. With polling or heartbeats, this means a short timeout rather than guaranteed immediate detection.

## 3. Voting cards and custom decks

### Decision

- The application provides built-in deck presets.
- The standard Fibonacci-style deck is one preset: `1, 2, 3, 5, 8, 13, 21, ?`.
- The host can create a custom deck for the room.
- Participants can change their vote until estimates are revealed.
- Before reveal, only voting status is visible. A participant's selected value remains hidden.

### Consequences

- The selected deck applies consistently to all participants in the room.
- Deck selection or customization should happen before voting begins.
- After reveal, each participant's selected card is shown.
- Editing a deck during an active round is not supported in the MVP; the host must start a new round before changing it.

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
- The room keeps a complete history of completed and revealed rounds, including multiple rounds for the same story.

### Consequences

- A history entry should retain the story, round number, participant display identifiers, and revealed votes.
- Revoting does not overwrite the earlier round.
- Round history is session-local only. It exists while the in-memory room exists and is lost when the host ends the room or the server restarts.
- This reconciles “complete round history” with the decision not to provide persistent history.

## 6. Disconnection and rejoining

### Decision

- A participant can rejoin using the same room code and display name.
- If the host disconnects, the room ends instead of allowing the host to rejoin.

### Consequences

- Because duplicate names are allowed, a display name alone cannot securely or reliably identify a returning participant.
- The preferred MVP behaviour is to retain the participant's generated identifier in the same browser and restore that identity after a refresh or brief reconnect.
- If the identifier is unavailable, joining with the same name creates a new participant with a new numeric identifier.
- Whether a restored participant also regains an unrevealed vote remains an open detail.

## 7. Persistence

### Decision

- All rooms, participants, votes, stories, decks, and round history are stored in server memory.
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
- The host has a clear opportunity to select a preset or custom deck before the first round.
- There is no separate ready-check or “open voting” action in the MVP. Adding a story begins voting.
- The complete flow is documented in [MVP user flow](./mvp-user-flow.md).

## Explicitly out of scope for the MVP

- User accounts and authentication
- Permanent session or round history
- Host transfer
- Automatic reconnection from another browser or device
- Chat, timers, statistics, and result export
- Production-grade recovery or deployment behaviour

## Open details to settle before implementation

These do not change the decisions above, but need a precise implementation rule:

1. Which additional built-in deck presets should accompany the Fibonacci-style deck?
2. What custom-card formats and limits should be accepted?
3. How long should the host-disconnection grace period be before the room ends?
4. Should a returning participant recover an unrevealed vote?
5. Should early reveal require confirmation when one or more participants have not voted?
6. How should complete round history be presented: inline below the active round or on a separate view?
7. Can participants join after the first round has started, and if so, when may they first vote?

