# Slice 1 Test Plan: Host Creates a Room

- **Slice:** 1 — Host creates a room
- **Status:** Implemented; automated verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [MVP vertical slices](./mvp-vertical-slices.md#slice-1-host-creates-a-room)

## Test objective

Verify that a host can enter a display name, create an in-memory Planning Poker room, and reach a lobby containing a shareable room code and generated host identity.

## Scope

This plan covers:

- React create-room form and lobby result
- `POST /api/rooms`
- Host-name validation and trimming
- Unique room-code generation
- Generated public host identifier and label
- Private host-token return and public-state filtering
- In-memory-only storage

Joining, polling, stories, voting, reveal, and later-round behavior are outside Slice 1.

## Prerequisites

1. Use Node.js 22 or another version supported by the installed dependencies.
2. From the repository root, run `npm install`.
3. No database, environment file, or external service is required.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Client tests confirm that a valid trimmed name reaches the lobby.
- Client tests confirm that a blank name is rejected before an API request.
- API tests confirm that valid room creation returns `201` and the expected session data.
- API tests confirm that a blank name returns `400` with a useful error.
- Room-store tests confirm that the host is included in the lobby.
- Room-store tests confirm that private tokens are omitted from public room state.
- Room-store tests force a room-code collision and confirm generation retries successfully.
- The React production build completes without errors.

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

### Test A: Blank-name validation

1. Leave **Your name** empty.
2. Select **Create room**.

Expected:

- The user remains on the create-room view.
- A useful message asks for a name.
- No room is created.

### Test B: Successful room creation

1. Enter `  Alex  `, including leading and trailing spaces.
2. Select **Create room**.

Expected:

- The Planning Poker lobby appears.
- A six-character room code is visible.
- The participant list contains `Alex #NNN`.
- The participant is marked as Host.
- The displayed name has no leading or trailing spaces.

### Test C: Distinct room codes

1. Open the application in a second browser tab.
2. Create another room.
3. Compare its room code with the first room.

Expected:

- Both rooms are created successfully.
- The two room codes differ.

### Test D: Response privacy

1. Open the browser's developer tools and select the Network panel.
2. Create a room.
3. Inspect the response from `POST /api/rooms`.

Expected:

- The top-level response contains a private `participantToken` for the host's current session.
- The public participant object contains `id`, `name`, `label`, and `role`.
- The public participant object does not contain a token.

## API smoke test

Send two valid `POST /api/rooms` requests with the body:

```json
{
  "hostName": "Alex"
}
```

For each response, verify:

- HTTP status is `201`.
- `room.status` is `lobby`.
- `room.code` contains six characters.
- `room.participants[0].label` uses the `Name #NNN` format.
- `participantToken` is present.
- The two room codes differ.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **5 passed**.
- Client automated tests: **2 passed**.
- Client production build: **passed**.
- Live API smoke test: **passed**; two rooms received different codes, and the first room returned lobby status with an `Alex #NNN` host label.
- Manual browser procedure: **not executed in the automated environment** because its in-app browser blocks localhost pages. The steps above remain the final human-visible acceptance check.

## Exit criteria

Slice 1 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–D pass in a local browser; and
- no database or persistent room-data file is created.

