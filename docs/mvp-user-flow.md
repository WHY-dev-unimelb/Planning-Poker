# Planning Poker MVP User Flow

- **Status:** Selected product flow
- **Recorded:** 13 October 2026
- **Related decisions:** [Product decision record](./product-decisions.md)

## Goal

Support a small team through a lobby-first Planning Poker session: gather participants, estimate a story privately, reveal the estimates, and either vote again or move to another story.

## 1. Create the room

1. The host provides a display name.
2. The host creates the room using the fixed Fibonacci-style deck.
3. The system generates:
   - a short room code; and
   - the host's participant identity, such as `Alex #123`.
4. The room enters the lobby state.
5. The host shares the room code with participants.

## 2. Join the lobby

1. A participant provides the room code and a display name.
2. The system validates that the room exists.
3. The system assigns a short identifier, such as `Sam #482`.
4. The participant joins the lobby.
5. Everyone in the room can see the current participant list.
6. Duplicate display names are allowed because the generated identifiers distinguish participants.

Participants may also join while an unrevealed round is active. A late participant sees the current story and may vote in that round.

## 3. Add the first story

1. The host waits until the intended participants have joined.
2. The host enters the story to be estimated.
3. Adding the story starts its first voting round.
4. Participants can see the current story and the fixed deck.

There is no separate ready-check or “open voting” step in the MVP.

## 4. Vote

1. Each participant selects one card from the active deck.
2. A participant may change their selection while the round remains unrevealed.
3. The room shows who has voted, but it does not show selected card values.
4. The host may wait for everyone or proceed before all participants have voted.

## 5. Reveal

1. The host reveals the round.
2. Participants can no longer change their votes for that round.
3. The system shows each participant's revealed estimate.
4. Participants who did not vote are shown as having no vote.
5. The revealed result remains visible until the host starts a revote or moves to the next story.

Only the host can reveal. Reveal is not automatic.

## 6. Move on

After reviewing the revealed estimates, the host chooses one of two paths.

### Revote

1. The previous revealed result is discarded.
2. The current story remains active.
3. Previous votes are cleared.
4. Participants vote again using the same flow.

### Next story

1. The previous revealed result is discarded.
2. The previous story is no longer active.
3. The host enters the next story.
4. Adding it starts the new story's voting round.
5. Participants vote again using the same flow.

## 7. Disconnection and room lifetime

### Participant joins again

1. The participant uses the same room code and display name.
2. The system treats them as a new participant and assigns a new numeric identifier.
3. Previous identity and vote recovery are not part of the MVP.

### Room lifetime

1. The MVP does not detect host disconnection or maintain precise presence.
2. A room remains in server memory after a browser closes or refreshes.
3. Restarting the server removes every room.

## Session states

The flow requires three active product states:

1. **Lobby:** the room exists and participants can assemble, but no story is active.
2. **Voting:** a story is active and estimates remain hidden.
3. **Revealed:** estimates are visible and the host can select Revote or Next story.

## Unresolved flow details

There are no blocking flow decisions for the MVP. Early-reveal confirmation and explicit room-ending behavior are deferred.
