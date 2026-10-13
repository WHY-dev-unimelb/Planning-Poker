# Planning Poker MVP Vertical Slices

- **Status:** Proposed implementation sequence
- **Recorded:** 13 October 2026
- **Architecture:** React client, Express HTTP API, in-memory server state, short-interval polling
- **Related documents:** [Product decisions](./product-decisions.md) and [MVP user flow](./mvp-user-flow.md)

## How to use this plan

Each slice delivers one observable outcome through the client, API, and server state. Each should be implemented, tested, and committed independently. Later slices build on earlier ones, so the full regression suite should pass before every commit.

The file paths below describe likely areas rather than a mandatory final structure:

- `client/src/` — React views, components, API client, and polling
- `server/src/app.*` — HTTP routes and response handling
- `server/src/rooms.*` — in-memory room state and product rules
- `client/test/` and `server/test/` — focused automated tests

## Slice 1: Host creates a room

**Status:** Accepted; automated and manual checks passed.

### Testable user outcome

A host enters a display name, creates a room, and reaches an empty lobby with a shareable room code and a generated identity such as `Alex #123`.

### Main files or areas involved

- Initial React application and create-room flow
- HTTP API application setup
- In-memory room store
- Room-code, public identifier, and private host-token generation
- Create-room client/API tests

### Acceptance checks

- A non-empty, trimmed host name creates a room.
- The response contains a short room code, public host identity, and private host token.
- The host appears in the new room's participant list.
- Two created rooms do not share a room code.
- A blank name is rejected with a useful message.
- No database or persistent file is created.

### Tests to run

- API test: valid room creation returns the expected lobby state.
- API test: blank or whitespace-only host name is rejected.
- Room-store test: generated room codes do not collide in a controlled sample.
- React test: submitting a valid name displays the lobby and room code.
- Manual check: create two rooms and confirm their codes differ.

## Slice 2: Participants join and the lobby synchronizes

**Status:** Accepted; automated and manual checks passed.

### Testable user outcome

A participant joins with a room code and display name, and all open clients see the updated participant list within the polling interval.

### Main files or areas involved

- Join-room React flow
- Join and room-state HTTP endpoints
- Public room-state serializer
- Client polling lifecycle
- Lobby participant list

### Acceptance checks

- A valid room code and non-empty name allow a participant to join.
- An unknown room code produces a clear error.
- Duplicate names are allowed and receive different numeric identifiers.
- Each join response includes a private participant token that is not exposed in public room state.
- The host and joined participants see the same roster after polling.
- Polling stops when the client leaves the room view.

### Tests to run

- API test: joining a valid room adds the participant.
- API test: joining an unknown room is rejected.
- API test: duplicate names receive distinct public identifiers and private tokens.
- Privacy test: public room state contains no private tokens.
- React test: polling updates the participant list.
- Manual check: open three browser windows, join twice with the same name, and verify distinct identifiers.

## Slice 3: Host adds the first story

**Status:** Accepted; automated and manual checks passed.

### Testable user outcome

The host adds a story from the lobby, and every participant sees that story enter the voting state.

### Main files or areas involved

- Host story-entry behavior
- Server room-state transition from lobby to voting
- Host authorization using the private token
- Current-story display in the React client
- Polling response handling for state changes

### Acceptance checks

- A host can add a non-empty story from the lobby.
- Adding the story immediately starts voting; there is no separate ready action.
- All clients see the same story after polling.
- A participant cannot add or replace the story.
- A blank story is rejected.
- A participant joining during voting sees the current story and may participate.

### Tests to run

- Room-rule test: adding a story changes the state from lobby to voting.
- API test: a valid host token can add a story.
- API test: participant and invalid tokens are forbidden from adding a story.
- API test: blank story text is rejected.
- React test: a polled voting state displays the current story.
- Manual check: add a story in the host window and confirm it appears in participant windows.

## Slice 4: Participants vote privately

**Status:** Accepted; automated and manual checks passed.

### Testable user outcome

Participants select or change a card while everyone can see who has voted without seeing any estimate value.

### Main files or areas involved

- Fixed Fibonacci card selection in React
- Vote-submission endpoint
- Server-side vote validation and storage
- Pre-reveal public room-state serializer
- Voting-status display

### Acceptance checks

- The available deck is exactly `1, 2, 3, 5, 8, 13, 21, ?`.
- A participant can submit one of those values during voting.
- Submitting another card replaces that participant's earlier vote.
- An invalid card value is rejected.
- A participant cannot vote using another participant's public identifier.
- Before reveal, every room-state response contains only voting status, never vote values.
- All clients see updated voting status after polling.

### Tests to run

- Room-rule test: a second vote replaces the first vote for the same participant.
- API test: valid deck values are accepted and invalid values are rejected.
- Authorization test: voting requires the participant's private token.
- Critical privacy test: inspect the raw pre-reveal API response and prove that it contains no vote values.
- React test: selecting another card changes the participant's selected state.
- Manual check: vote in one window and inspect both the visible interface and raw room-state response in another.

## Slice 5: Host reveals estimates

**Status:** Accepted; automated and manual checks passed.

### Testable user outcome

The host reveals the round and every participant sees the submitted estimates, including an explicit no-vote result for anyone who did not vote.

### Main files or areas involved

- Reveal action in the host flow
- Server transition from voting to revealed
- Revealed room-state serializer
- Revealed-results display
- Authorization and state-transition tests

### Acceptance checks

- Only the host can reveal.
- The host can reveal before everyone has voted.
- Revealed room state contains submitted vote values.
- Participants who did not vote are shown as having no vote.
- Votes cannot be submitted or changed after reveal.
- All clients see the revealed state after polling.

### Tests to run

- API test: a valid host token reveals the round.
- Authorization test: a participant cannot reveal.
- State test: reveal succeeds when one or more participants have not voted.
- State test: voting after reveal is rejected.
- React test: revealed state shows values and non-voters correctly.
- Manual check: reveal early with one voter and one non-voter across separate windows.

## Slice 6: Host starts a revote

**Status:** Implemented; automated checks passed, manual browser acceptance pending.

### Testable user outcome

After reveal, the host starts a new vote for the same story and all previous votes disappear.

### Main files or areas involved

- Revote host action
- Server transition from revealed back to voting
- Vote reset behavior
- Client handling of the reset voting state

### Acceptance checks

- Only the host can start a revote.
- Revote is available only after reveal.
- The story text remains unchanged.
- Every previous vote and voting-status marker is cleared.
- The previous revealed result is not retained as history.
- Participants can submit new votes after the reset.

### Tests to run

- Room-rule test: revote preserves the story and clears all votes.
- API test: revote is rejected before reveal.
- Authorization test: a participant cannot start a revote.
- React test: receiving the reset state clears selections and revealed results.
- Manual check: vote, reveal, revote, and confirm all clients return to a clean voting state.

## Slice 7: Host moves to the next story

### Testable user outcome

After reveal, the host moves on, enters another story, and begins a clean voting round for it.

### Main files or areas involved

- Next-story host flow
- Server transition from revealed to the next voting round
- Story replacement and vote clearing
- Client story-entry and state-reset behavior

### Acceptance checks

- Only the host can move to the next story.
- The action is available only after reveal.
- The next story must contain non-empty text.
- The current story is replaced and all votes are cleared.
- The earlier result is discarded rather than stored as history.
- All clients see the next story and can vote again.

### Tests to run

- Room-rule test: next story replaces the story and clears every vote.
- API test: blank next-story text is rejected.
- API test: next story is rejected before reveal.
- Authorization test: a participant cannot move to the next story.
- React test: the next story replaces the previous revealed result.
- Manual check: complete two stories across multiple browser windows.

## Slice 8: Reviewer can run and verify the MVP

### Testable user outcome

A reviewer can follow the repository instructions, start the client and server, run the tests, and complete the full Planning Poker flow without undocumented setup.

### Main files or areas involved

- Root project scripts and dependency setup
- Repository `README.md`
- Environment defaults and local development instructions
- Full automated suite
- Final manual acceptance checklist

### Acceptance checks

- Installation, startup, and test commands are documented.
- The server starts with an empty in-memory room store.
- Restarting the server removes existing rooms as documented.
- Invalid or missing rooms display a useful message instead of a broken view.
- The README clearly lists the MVP limitations and deferred features.
- No database, account setup, or external service is required.

### Tests to run

- Run the complete automated test suite from a clean installation.
- Run the production build or equivalent compile check.
- Restart the server and confirm an old room code is no longer valid.
- Manually complete: create room, join twice, add story, vote, change vote, reveal early, revote, reveal again, and move to the next story.
- Verify that pre-reveal API responses never contain vote values.

## Commit boundaries

Use one focused commit per slice. Do not combine a later feature with an earlier slice merely because the same file is open. A slice is complete only when its acceptance checks pass and its focused tests plus the existing regression suite are green.

Suggested commit subjects:

1. `feat: create planning poker rooms`
2. `feat: join and synchronize room lobby`
3. `feat: start voting with a user story`
4. `feat: submit hidden planning poker votes`
5. `feat: reveal round estimates`
6. `feat: restart voting for the current story`
7. `feat: move voting to the next story`
8. `docs: add MVP setup and verification guidance`

## Deferred until after the MVP

- Additional deck presets and custom decks
- Complete or persistent round history
- Identity and vote restoration after refresh or disconnection
- Precise presence and automatic host-disconnection handling
- Explicit room-ending and automatic room cleanup
- Host transfer, chat, timers, statistics, and exports
