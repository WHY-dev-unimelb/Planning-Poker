# Slice 14 Test Plan: Room Usability Improvements

- **Slice:** 14 — Room usability improvements
- **Status:** Automated verification passed; manual verification pending
- **Recorded:** 13 October 2026
- **Related specification:** [Slice 14 usability improvements](./slice-14-usability-improvements.md)

## Test objective

Verify that copying, current-user identification, leaving, home return, and cross-tab name persistence work without weakening hidden-vote privacy, immutable history, host authority, or tab-scoped room restoration.

## Automated test procedure

From the repository root, run:

```text
npm test
npm run build
```

### Verified automated results

- Server tests: **59 passed**.
- Client tests: **33 passed**.
- Client production build: **passed**.
- Create, join, and restore responses identify the current participant without exposing private tokens in room state.
- Participant leave removes the active roster entry and active vote, invalidates the old token, and preserves revealed history.
- Rejoining creates a new participant identifier and a clean vote state.
- While active, the host sees **End room** without a duplicate **Leave room** action; after ending, **Leave room** returns the host home.
- Invalid leave credentials are rejected.
- Copy feedback, **You** badges, return-home behavior, and name persistence are covered by React tests.
- Direct API calls cannot exceed the 60-character name or 500-character story limits.
- The 100-participant room boundary returns a clear conflict response rather than exhausting identifiers.
- Blocked `sessionStorage` access does not crash room entry or prevent local cleanup after leaving.
- Polling waits for the current request to settle before scheduling another request.
- Copy-success feedback automatically resets after two seconds.

## Manual browser test procedure

### Test A: Copy a room code

1. Create a room.
2. Select **Copy** next to the room code.
3. Paste into a text field.

Expected:

- The pasted value exactly matches the room code.
- The control confirms **Copied!** for two seconds, then returns to **Copy**.
- If clipboard permission is unavailable, a useful manual-copy message appears.

### Test B: Identify the current user

1. Create a room as Alex.
2. Join from another tab as Sam.
3. Compare both participant lists.

Expected:

- Alex sees **Host** and **You** next to Alex.
- Sam sees **You** next to Sam and **Host** next to Alex.
- **Host** and **You** use visibly different colors.

### Test C: Participant leaves an active vote

1. Start a story and have Sam vote.
2. Select **Leave room** as Sam.
3. Observe Alex's tab after its next poll.
4. Rejoin as Sam and reveal.

Expected:

- Sam immediately returns to room entry with the name still filled in.
- Sam disappears from the active roster and the old active vote is removed.
- Rejoining creates a new numeric suffix and shows no restored selection.
- Any history revealed before leaving still includes the original immutable result.

### Test D: Host ends the room

1. Confirm that the host sees **End room** and does not see **Leave room**.
2. Select **End room** as the host.
3. Cancel the warning once, then repeat and confirm.
4. From the ended state, select **Leave room**.

Expected:

- Cancelling keeps the room active.
- Only one room-ending control is presented to the host.
- Confirming shows the host-ended terminal state.
- Participant tabs show the host-ended room state after polling.
- The ended host sees **Leave room**, and selecting it returns to room entry and clears the tab session.

### Test E: Name and credential storage boundaries

1. Enter a display name in one tab.
2. Open the application in another tab and switch between create and join.
3. Create or join, leave, and refresh the home page.

Expected:

- The display name is available in both tabs and remains after leaving and refreshing.
- Leading and trailing spaces are normalized when creating or joining.
- Leaving clears that tab's saved room session.
- A room session is not automatically restored in a different tab.
- If browser session storage is blocked, the current tab remains usable but cannot restore the room after refresh.

## Exit criteria

Slice 14 is accepted when the automated suite and build remain green and Tests A–E pass in the browser.

