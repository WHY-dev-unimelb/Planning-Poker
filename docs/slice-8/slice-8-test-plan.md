# Slice 8 Test Plan: Host Chooses a Preset Deck

- **Slice:** 8 — Host chooses a preset deck
- **Status:** Accepted; automated and manual verification passed
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-8-host-chooses-a-preset-deck)

## Test objective

Verify that the host can select Fibonacci, T-shirt, or Powers of two while creating a room and that all voting, validation, synchronization, and privacy rules use that room's selected deck.

## Scope

This plan covers:

- Preset selection during room creation
- Fibonacci as the default preset
- Server-side preset validation
- Room-specific deck storage and serialization
- Vote validation against the selected room deck
- Dynamic React card rendering
- Existing hidden-vote privacy behavior

Custom deck entry remains outside Slice 8. Slice 9 was later cancelled for the current delivery scope.

## Preset definitions

- Fibonacci: `1, 2, 3, 5, 8, 13, 21, ?`
- T-shirt: `XS, S, M, L, XL, ?`
- Powers of two: `1, 2, 4, 8, 16, 32, ?`

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Expected automated results

- Existing MVP and Slice 7 tests continue to pass.
- A room without an explicit preset uses Fibonacci.
- A supported preset is accepted during room creation.
- An unknown preset receives `400` with a useful message.
- The room exposes the selected cards once voting starts.
- A card belonging to the selected preset is accepted.
- A card belonging only to another preset is rejected.
- React sends the selected preset in the create-room request.
- React renders the selected room deck rather than the Fibonacci cards.
- Pre-reveal public room state still does not expose selected values.
- The production client build completes successfully.

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

### Test A: Confirm the default deck

1. Open the create-room view.
2. Confirm the initial **Estimation deck** selection.
3. Create a room without changing it and add a story.

Expected:

- Fibonacci is selected by default.
- Voting shows exactly `1, 2, 3, 5, 8, 13, 21, ?`.

### Test B: Use the T-shirt preset

1. Create another room and select **T-shirt**.
2. Join that room in a second browser window.
3. Add a story.

Expected:

- Both clients show exactly `XS, S, M, L, XL, ?`.
- Neither client shows Fibonacci-only cards such as `13` or `21`.

### Test C: Vote and reveal with T-shirt cards

1. Select `M` as one participant and `XL` as the other.
2. Inspect both clients before reveal.
3. Reveal from the host window.

Expected:

- Before reveal, clients show only **Voted** status and no `M` or `XL` result values.
- After reveal, both clients show the submitted T-shirt estimates.

### Test D: Use the Powers of two preset

1. Create a third room and select **Powers of two**.
2. Add a story and join from another window.

Expected:

- Both clients show exactly `1, 2, 4, 8, 16, 32, ?`.
- Cards `3, 5, 13, 21` are absent.

### Test E: Preserve the selected deck across rounds

1. Complete and reveal a round using Powers of two.
2. Start a revote and inspect the cards.
3. Reveal again, start the next story, and inspect the cards.

Expected:

- Revote continues to use Powers of two.
- The next story continues to use Powers of two.
- No action changes the room back to Fibonacci.

### Test F: Confirm invalid preset and card validation

Send direct API requests using an unknown preset and a card that is not in the selected room deck.

Expected:

- Unknown preset creation receives HTTP `400`.
- The error says to choose a supported deck preset.
- A Fibonacci-only card submitted to a T-shirt room receives HTTP `400`.
- Invalid requests do not change the room or its votes.

## Verification record

Executed on 13 October 2026:

- Server automated tests: **39 passed**.
- Client automated tests: **18 passed**.
- Client production build: **passed**.
- Server preset selection, unknown-preset validation, and room-specific vote validation: **passed**.
- Client preset submission and dynamic card rendering: **passed**.
- Existing hidden-vote privacy regression tests: **passed**.
- Manual browser procedure: **passed; confirmed by the user on 13 October 2026**.

## Exit criteria

Slice 8 is accepted when:

- `npm test` passes;
- `npm run build` passes;
- Tests A–F pass in local browser sessions;
- every client in a room shows the same selected deck; and
- no selected estimate is exposed before reveal.
