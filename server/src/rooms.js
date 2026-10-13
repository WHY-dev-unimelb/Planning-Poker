import { randomInt, randomUUID } from 'node:crypto';

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;
export const PLANNING_POKER_DECK = Object.freeze(['1', '2', '3', '5', '8', '13', '21', '?']);

export class RoomValidationError extends Error {}
export class RoomNotFoundError extends Error {}
export class RoomAuthorizationError extends Error {}
export class RoomStateError extends Error {}

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

  function addStory(roomCode, participantToken, storyText) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can add a story.');
    }

    if (room.status !== 'lobby') {
      throw new RoomStateError('A story is already active.');
    }

    const normalizedStory = typeof storyText === 'string' ? storyText.trim() : '';
    if (!normalizedStory) {
      throw new RoomValidationError('Enter a story to start voting.');
    }

    room.currentStory = { text: normalizedStory };
    room.votes = new Map();
    room.status = 'voting';
    return toPublicRoom(room);
  }

  function submitVote(roomCode, participantToken, value) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }

    const participant = room.participants.find(({ token }) => token === participantToken);
    if (!participant) {
      throw new RoomAuthorizationError('A valid participant token is required to vote.');
    }

    if (room.status !== 'voting') {
      throw new RoomStateError('Voting is not active.');
    }

    if (typeof value !== 'string' || !PLANNING_POKER_DECK.includes(value)) {
      throw new RoomValidationError('Choose a card from the Planning Poker deck.');
    }

    room.votes.set(participant.id, value);
    return {
      room: toPublicRoom(room),
      selectedVote: value,
    };
  }

  function revealRound(roomCode, participantToken) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can reveal estimates.');
    }

    if (room.status !== 'voting') {
      throw new RoomStateError('Estimates can only be revealed while voting is active.');
    }

    room.status = 'revealed';
    return toPublicRoom(room);
  }

  function toPublicRoom(room) {
    const publicRoom = {
      code: room.code,
      status: room.status,
      participants: room.participants.map(({ token: _token, ...participant }) => ({
        ...participant,
        ...(room.status === 'voting' ? { hasVoted: room.votes.has(participant.id) } : {}),
        ...(room.status === 'revealed'
          ? { vote: room.votes.get(participant.id) ?? null }
          : {}),
      })),
    };
    if (room.currentStory) {
      publicRoom.currentStory = { ...room.currentStory };
      publicRoom.deck = [...PLANNING_POKER_DECK];
    }
    return publicRoom;
  }

  return {
    createRoom,
    joinRoom,
    addStory,
    submitVote,
    revealRound,
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

