import { randomInt, randomUUID } from 'node:crypto';

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

export class RoomValidationError extends Error {}
export class RoomNotFoundError extends Error {}

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

  function normalizeName(name, action) {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (!normalizedName) {
      throw new RoomValidationError(`Enter your name to ${action} a room.`);
    }
    return normalizedName;
  }

  function generateUniqueParticipantId(participants) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = idGenerator();
      if (!participants.some((participant) => participant.id === candidate)) {
        return candidate;
      }
    }
    throw new Error('Unable to generate a unique participant identifier.');
  }

  function createParticipant(participants, name, role) {
    const id = generateUniqueParticipantId(participants);
    return {
      id,
      name,
      label: `${name} #${id}`,
      role,
      token: tokenGenerator(),
    };
  }

  function createRoom(hostName) {
    const normalizedName = normalizeName(hostName, 'create');

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

    const host = createParticipant([], normalizedName, 'host');

    const room = {
      code,
      status: 'lobby',
      participants: [host],
    };
    rooms.set(code, room);

    return {
      room: toPublicRoom(room),
      participantToken: host.token,
    };
  }

  function joinRoom(roomCode, participantName) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }

    const normalizedName = normalizeName(participantName, 'join');
    const participant = createParticipant(room.participants, normalizedName, 'participant');
    room.participants.push(participant);

    return {
      room: toPublicRoom(room),
      participantToken: participant.token,
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
    joinRoom,
    getRoom(code) {
      const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const room = rooms.get(normalizedCode);
      return room ? toPublicRoom(room) : undefined;
    },
    get size() {
      return rooms.size;
    },
  };
}

