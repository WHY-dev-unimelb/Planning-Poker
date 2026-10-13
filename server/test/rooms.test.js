import { describe, expect, it } from 'vitest';
import { createRoomStore, RoomValidationError } from '../src/rooms.js';

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
});

