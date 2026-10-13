import { randomInt, randomUUID } from 'node:crypto';

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

export class RoomValidationError extends Error {}

export function generateRoomCode() {
  return Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_CHARACTERS[randomInt(ROOM_CODE_CHARACTERS.length)],
  ).join('');
}

export function createRoomStore({
  codeGenerator = generateRoomCode,
  idGenerator = () => String(randomInt(100, 1000)),
  tokenGenerator = randomUUID,
} = {}) {
  const rooms = new Map();

  function createRoom(hostName) {
    const normalizedName = typeof hostName === 'string' ? hostName.trim() : '';
    if (!normalizedName) {
      throw new RoomValidationError('Enter your name to create a room.');
    }

    let code;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = codeGenerator();
      if (!rooms.has(candidate)) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      throw new Error('Unable to generate a unique room code.');
    }

    const participantId = idGenerator();
    const participantToken = tokenGenerator();
    const host = {
      id: participantId,
      name: normalizedName,
      label: `${normalizedName} #${participantId}`,
      role: 'host',
      token: participantToken,
    };

    const room = {
      code,
      status: 'lobby',
      participants: [host],
    };
    rooms.set(code, room);

    return {
      room: toPublicRoom(room),
      participantToken,
    };
  }

  function toPublicRoom(room) {
    return {
      code: room.code,
      status: room.status,
      participants: room.participants.map(({ token: _token, ...participant }) => participant),
    };
  }

  return {
    createRoom,
    getRoom(code) {
      const room = rooms.get(code);
      return room ? toPublicRoom(room) : undefined;
    },
    get size() {
      return rooms.size;
    },
  };
}

