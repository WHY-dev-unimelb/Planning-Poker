import { describe, expect, it } from 'vitest';
import {
  createRoomStore,
  RoomNotFoundError,
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
});

