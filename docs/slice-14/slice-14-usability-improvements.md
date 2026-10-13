# Slice 14: Room Usability Improvements

- **Status:** Implemented; automated verification passed, manual verification pending
- **Recorded:** 13 October 2026
- **Related plan:** [Extended features vertical slices](../planning-poker-extended-features-vertical-slices.md#slice-14-room-usability-improvements)
- **Test plan:** [Slice 14 test plan](./slice-14-test-plan.md)

## User outcome

Room entry and exit are easier to understand: users can copy the room code, identify themselves in the participant list, deliberately leave, return to room entry, and reuse their display name.

## Confirmed product decisions

- The room code has a **Copy** control with visible success or failure feedback.
- The current participant has a green **You** badge. The host keeps the separate blue **Host** badge, so a host sees both.
- Participants can select **Leave room**. While a room is active, the host sees only **End room**, avoiding two controls with the same room-ending effect. After the room ends, the host sees **Leave room** to return home.
- A participant who leaves is immediately removed from the active participant list and any active vote they submitted is removed.
- Completed round history is immutable; leaving does not rewrite previous revealed snapshots.
- The host uses the existing confirmed **End room** action to end the room for everyone, then uses **Leave room** from the ended state to return to room entry.
- Leaving clears the tab-scoped room credentials and returns the user to room entry.
- Rejoining after leaving creates a new participant identifier and session.
- The display name is stored in `localStorage`, so it survives leaving, navigation back to room entry, refresh, and use in another tab on the same browser profile.
- Room credentials remain in `sessionStorage`; they are not shared across tabs.

## Areas changed

- React room header, participant list, room-management actions, and room-entry name field
- Browser clipboard, `localStorage`, and `sessionStorage` handling
- Participant identity returned in create, join, and restore responses
- Authenticated leave-room API endpoint
- In-memory participant removal, active-vote cleanup, and host-ending rules
- Client, API, and room-store regression tests

## Deliberate limitations

- Clipboard failure falls back to an instruction to select and copy the visible code manually.
- Display names are convenience data, not credentials or user accounts.
- No data persists after a server restart, apart from the browser's remembered display name.
- Leaving an already ended room only returns the local client home; the retained in-memory tombstone is unchanged.

## Implementation verification

Automated on 13 October 2026:

- Server tests: **53 passed**.
- Client tests: **29 passed**.
- Client production build: **passed**.

