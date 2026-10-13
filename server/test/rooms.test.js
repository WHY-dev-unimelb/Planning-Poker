import { describe, expect, it } from 'vitest';
import {
  createRoomStore,
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
});

