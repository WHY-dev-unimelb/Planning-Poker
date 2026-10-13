import { describe, expect, it } from 'vitest';
import {
  createRoomStore,
  DECK_PRESETS,
  PLANNING_POKER_DECK,
  RoomAuthorizationError,
  RoomNotFoundError,
  RoomStateError,
  RoomValidationError,
} from '../src/rooms.js';

describe('room store', () => {
  it('creates a lobby with a trimmed host name and private token', () => {
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'private-token',
    });

    const session = store.createRoom('  Alex  ');

    expect(session).toEqual({
      room: {
        code: 'ABC123',
        status: 'lobby',
        participants: [
          { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
        ],
      },
      participantToken: 'private-token',
    });
    expect(store.getRoom('ABC123')).not.toHaveProperty('participants.0.token');
  });

  it('rejects a blank host name', () => {
    const store = createRoomStore();

    expect(() => store.createRoom('   ')).toThrow(RoomValidationError);
  });

  it('uses the selected deck preset for voting and rejects unknown presets', () => {
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'host-token',
    });

    store.createRoom('Alex', 'tshirt');
    const room = store.addStory('ABC123', 'host-token', 'Estimate visual polish');

    expect(room.deck).toEqual(DECK_PRESETS.tshirt);
    expect(store.submitVote('ABC123', 'host-token', 'XL').selectedVote).toBe('XL');
    expect(() => store.submitVote('ABC123', 'host-token', '13')).toThrow(
      RoomValidationError,
    );

    const invalidStore = createRoomStore();
    expect(() => invalidStore.createRoom('Sam', 'unknown')).toThrow(RoomValidationError);
  });

  it('retries when a generated room code already exists', () => {
    const codes = ['ABC123', 'ABC123', 'XYZ789'];
    const store = createRoomStore({
      codeGenerator: () => codes.shift(),
      idGenerator: () => '123',
      tokenGenerator: () => 'private-token',
    });

    const firstRoom = store.createRoom('Alex');
    const secondRoom = store.createRoom('Sam');

    expect(firstRoom.room.code).toBe('ABC123');
    expect(secondRoom.room.code).toBe('XYZ789');
    expect(store.size).toBe(2);
  });

  it('allows duplicate names while assigning unique identifiers and tokens', () => {
    const ids = ['123', '123', '456', '789'];
    const tokens = ['host-token', 'first-token', 'second-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');

    const firstJoin = store.joinRoom('abc123', 'Alex');
    const secondJoin = store.joinRoom('ABC123', 'Alex');

    expect(firstJoin.participantToken).toBe('first-token');
    expect(secondJoin.participantToken).toBe('second-token');
    expect(secondJoin.room.participants.map((participant) => participant.label)).toEqual([
      'Alex #123',
      'Alex #456',
      'Alex #789',
    ]);
    expect(store.getRoom('ABC123').participants).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ token: expect.anything() })]),
    );
  });

  it('rejects joining a room that does not exist', () => {
    const store = createRoomStore();

    expect(() => store.joinRoom('MISSING', 'Alex')).toThrow(RoomNotFoundError);
  });

  it('restores the same participant and only that participant\'s active vote', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');
    store.submitVote('ABC123', 'host-token', '5');
    store.submitVote('ABC123', 'participant-token', '8');

    const restored = store.restoreSession('ABC123', 'participant-token');

    expect(restored.participantToken).toBe('participant-token');
    expect(restored.participantRole).toBe('participant');
    expect(restored.selectedVote).toBe('8');
    expect(restored.room.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Alex #123', hasVoted: true }),
        expect.objectContaining({ label: 'Sam #456', hasVoted: true }),
      ]),
    );
    expect(restored.room.participants.every((participant) => !('vote' in participant))).toBe(true);
    expect(() => store.restoreSession('ABC123', 'invalid-token')).toThrow(
      RoomAuthorizationError,
    );
    expect(() => store.restoreSession('MISSING', 'participant-token')).toThrow(
      RoomNotFoundError,
    );
  });

  it('lets the host add a trimmed story and starts voting', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');

    const room = store.addStory('ABC123', 'host-token', '  Estimate login flow  ');
    const lateJoin = store.joinRoom('ABC123', 'Sam');

    expect(room.status).toBe('voting');
    expect(room.currentStory).toEqual({ text: 'Estimate login flow' });
    expect(lateJoin.room.currentStory).toEqual({ text: 'Estimate login flow' });
  });

  it('prevents a participant from adding a story', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');

    expect(() => store.addStory('ABC123', 'participant-token', 'A story')).toThrow(
      RoomAuthorizationError,
    );
  });

  it('does not replace an active story', () => {
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'host-token',
    });
    store.createRoom('Alex');
    store.addStory('ABC123', 'host-token', 'First story');

    expect(() => store.addStory('ABC123', 'host-token', 'Second story')).toThrow(RoomStateError);
  });

  it('replaces a participant vote without exposing its value in public room state', () => {
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'host-token',
    });
    store.createRoom('Alex');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');

    const firstVote = store.submitVote('ABC123', 'host-token', '3');
    const changedVote = store.submitVote('ABC123', 'host-token', '8');

    expect(firstVote.selectedVote).toBe('3');
    expect(changedVote.selectedVote).toBe('8');
    expect(changedVote.room.deck).toEqual(PLANNING_POKER_DECK);
    expect(changedVote.room.participants[0].hasVoted).toBe(true);
    expect(changedVote.room).not.toHaveProperty('votes');
    expect(changedVote.room.participants[0]).not.toHaveProperty('vote');
  });

  it('rejects invalid card values and invalid participant tokens', () => {
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'host-token',
    });
    store.createRoom('Alex');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');

    expect(() => store.submitVote('ABC123', 'host-token', '100')).toThrow(
      RoomValidationError,
    );
    expect(() => store.submitVote('ABC123', 'invalid-token', '5')).toThrow(
      RoomAuthorizationError,
    );
  });

  it('lets the host reveal early and freezes the round', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');
    store.submitVote('ABC123', 'participant-token', '8');

    const room = store.revealRound('ABC123', 'host-token');

    expect(room.status).toBe('revealed');
    expect(room.participants).toEqual([
      expect.objectContaining({ label: 'Alex #123', vote: null }),
      expect.objectContaining({ label: 'Sam #456', vote: '8' }),
    ]);
    expect(() => store.submitVote('ABC123', 'participant-token', '13')).toThrow(RoomStateError);
  });

  it('prevents a participant from revealing estimates', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');

    expect(() => store.revealRound('ABC123', 'participant-token')).toThrow(
      RoomAuthorizationError,
    );
  });

  it('restarts voting for the same story and clears every vote', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');
    store.submitVote('ABC123', 'host-token', '5');
    store.submitVote('ABC123', 'participant-token', '8');
    store.revealRound('ABC123', 'host-token');

    const room = store.restartVoting('ABC123', 'host-token');

    expect(room.status).toBe('voting');
    expect(room.currentStory).toEqual({ text: 'Estimate login flow' });
    expect(room.participants.every(({ hasVoted }) => hasVoted === false)).toBe(true);
    expect(room.participants.every((participant) => !Object.hasOwn(participant, 'vote'))).toBe(true);
    expect(store.submitVote('ABC123', 'participant-token', '13').selectedVote).toBe('13');
  });

  it('allows only the host to revote and only after reveal', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'Estimate login flow');

    expect(() => store.restartVoting('ABC123', 'host-token')).toThrow(RoomStateError);
    store.revealRound('ABC123', 'host-token');
    expect(() => store.restartVoting('ABC123', 'participant-token')).toThrow(
      RoomAuthorizationError,
    );
  });

  it('starts a clean vote for the next story and discards the previous result', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'First story');
    store.submitVote('ABC123', 'host-token', '5');
    store.submitVote('ABC123', 'participant-token', '8');
    store.revealRound('ABC123', 'host-token');

    const room = store.startNextStory('ABC123', 'host-token', '  Second story  ');

    expect(room.status).toBe('voting');
    expect(room.currentStory).toEqual({ text: 'Second story' });
    expect(room.participants.every(({ hasVoted }) => hasVoted === false)).toBe(true);
    expect(room.participants.every((participant) => !Object.hasOwn(participant, 'vote'))).toBe(true);
    expect(store.submitVote('ABC123', 'participant-token', '13').selectedVote).toBe('13');
  });

  it('allows only the host to start a non-blank next story after reveal', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'First story');

    expect(() => store.startNextStory('ABC123', 'host-token', 'Second story')).toThrow(
      RoomStateError,
    );
    store.revealRound('ABC123', 'host-token');
    expect(() => store.startNextStory('ABC123', 'participant-token', 'Second story')).toThrow(
      RoomAuthorizationError,
    );
    expect(() => store.startNextStory('ABC123', 'host-token', '   ')).toThrow(
      RoomValidationError,
    );
  });

  it('keeps immutable revealed history across revotes, stories, and late joins', () => {
    const ids = ['123', '456', '789'];
    const tokens = ['host-token', 'participant-token', 'late-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');
    store.addStory('ABC123', 'host-token', 'First story');
    store.submitVote('ABC123', 'host-token', '5');
    store.submitVote('ABC123', 'participant-token', '8');

    const firstReveal = store.revealRound('ABC123', 'host-token');
    expect(firstReveal.history[0]).toEqual({
      storyNumber: 1,
      roundNumber: 1,
      story: { text: 'First story' },
      participants: [
        { id: '123', label: 'Alex #123', role: 'host', vote: '5' },
        { id: '456', label: 'Sam #456', role: 'participant', vote: '8' },
      ],
    });

    store.restartVoting('ABC123', 'host-token');
    store.submitVote('ABC123', 'host-token', '13');
    const secondReveal = store.revealRound('ABC123', 'host-token');
    expect(secondReveal.history[1]).toEqual(
      expect.objectContaining({ storyNumber: 1, roundNumber: 2 }),
    );
    expect(secondReveal.history[0].participants[0].vote).toBe('5');

    store.startNextStory('ABC123', 'host-token', 'Second story');
    const lateJoin = store.joinRoom('ABC123', 'Taylor');
    expect(lateJoin.room.history).toHaveLength(2);
    store.submitVote('ABC123', 'late-token', '3');
    const thirdReveal = store.revealRound('ABC123', 'host-token');

    expect(thirdReveal.history[2]).toEqual(
      expect.objectContaining({
        storyNumber: 2,
        roundNumber: 1,
        story: { text: 'Second story' },
      }),
    );
    expect(thirdReveal.history[2].participants).toContainEqual(
      expect.objectContaining({ label: 'Taylor #789', vote: '3' }),
    );
    expect(JSON.stringify(thirdReveal.history)).not.toContain('token');
  });

  it('ends the room after a 15-second host lease expires but renews within the grace period', () => {
    let currentTime = 0;
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
      now: () => currentTime,
      hostDisconnectGraceMs: 15_000,
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');

    currentTime = 14_000;
    expect(store.getRoom('ABC123', 'host-token').status).toBe('lobby');
    currentTime = 28_000;
    expect(store.getRoom('ABC123', 'participant-token').status).toBe('lobby');
    currentTime = 29_001;

    const endedRoom = store.getRoom('ABC123', 'participant-token');
    expect(endedRoom).toEqual(expect.objectContaining({
      status: 'ended',
      endedReason: 'host-disconnected',
      endedMessage: 'The room ended because the host disconnected.',
    }));
    expect(() => store.joinRoom('ABC123', 'Taylor')).toThrow(RoomStateError);
    expect(() => store.addStory('ABC123', 'host-token', 'Too late')).toThrow(RoomStateError);
  });

  it('restoring the host within the grace period renews the lease', () => {
    let currentTime = 0;
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => '123',
      tokenGenerator: () => 'host-token',
      now: () => currentTime,
      hostDisconnectGraceMs: 15_000,
    });
    store.createRoom('Alex');

    currentTime = 14_999;
    expect(store.restoreSession('ABC123', 'host-token').room.status).toBe('lobby');
    currentTime = 29_998;
    expect(store.getRoom('ABC123').status).toBe('lobby');
  });

  it('allows only the host to explicitly end a room and keeps the ended tombstone', () => {
    const ids = ['123', '456'];
    const tokens = ['host-token', 'participant-token'];
    const store = createRoomStore({
      codeGenerator: () => 'ABC123',
      idGenerator: () => ids.shift(),
      tokenGenerator: () => tokens.shift(),
    });
    store.createRoom('Alex');
    store.joinRoom('ABC123', 'Sam');

    expect(() => store.endRoom('ABC123', 'participant-token')).toThrow(
      RoomAuthorizationError,
    );
    const endedRoom = store.endRoom('ABC123', 'host-token');

    expect(endedRoom).toEqual(expect.objectContaining({
      status: 'ended',
      endedReason: 'host-ended',
      endedMessage: 'The host ended this room.',
    }));
    expect(store.endRoom('ABC123', 'host-token')).toEqual(endedRoom);
    expect(store.getRoom('ABC123')).toEqual(endedRoom);
    expect(() => store.submitVote('ABC123', 'participant-token', '5')).toThrow(
      RoomStateError,
    );
  });
});

