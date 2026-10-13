import { randomInt, randomUUID } from 'node:crypto';

const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;
export const HOST_DISCONNECT_GRACE_MS = 15_000;
export const DECK_PRESETS = Object.freeze({
  fibonacci: Object.freeze(['1', '2', '3', '5', '8', '13', '21', '?']),
  tshirt: Object.freeze(['XS', 'S', 'M', 'L', 'XL', '?']),
  'powers-of-two': Object.freeze(['1', '2', '4', '8', '16', '32', '?']),
});
export const PLANNING_POKER_DECK = DECK_PRESETS.fibonacci;

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
  now = Date.now,
  hostDisconnectGraceMs = HOST_DISCONNECT_GRACE_MS,
} = {}) {
  const rooms = new Map();

  function endRoomState(room, reason) {
    room.status = 'ended';
    room.endedReason = reason;
    room.endedMessage = reason === 'host-disconnected'
      ? 'The room ended because the host disconnected.'
      : 'The host ended this room.';
  }

  function expireRoomIfHostInactive(room) {
    if (
      room.status !== 'ended'
      && now() - room.hostLastSeenAt >= hostDisconnectGraceMs
    ) {
      endRoomState(room, 'host-disconnected');
    }
  }

  function requireActiveRoom(room) {
    if (room.status === 'ended') {
      throw new RoomStateError('This room has ended.');
    }
  }

  function renewHostLease(room, participantToken) {
    const isHost = room.participants.some(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (isHost && room.status !== 'ended') {
      room.hostLastSeenAt = now();
    }
  }

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

  function createRoom(hostName, deckPreset = 'fibonacci') {
    const normalizedName = normalizeName(hostName, 'create');
    if (typeof deckPreset !== 'string' || !Object.hasOwn(DECK_PRESETS, deckPreset)) {
      throw new RoomValidationError('Choose a supported deck preset.');
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

    const host = createParticipant([], normalizedName, 'host');

    const room = {
      code,
      status: 'lobby',
      deckPreset,
      history: [],
      currentStoryNumber: 0,
      hostLastSeenAt: now(),
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
    expireRoomIfHostInactive(room);
    requireActiveRoom(room);

    const normalizedName = normalizeName(participantName, 'join');
    const participant = createParticipant(room.participants, normalizedName, 'participant');
    room.participants.push(participant);

    return {
      room: toPublicRoom(room),
      participantToken: participant.token,
    };
  }

  function restoreSession(roomCode, participantToken) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }
    expireRoomIfHostInactive(room);

    const participant = room.participants.find(({ token }) => token === participantToken);
    if (!participant) {
      throw new RoomAuthorizationError('This participant session is no longer valid.');
    }
    renewHostLease(room, participantToken);

    return {
      room: toPublicRoom(room),
      participantToken: participant.token,
      participantRole: participant.role,
      selectedVote: room.status === 'voting' ? room.votes.get(participant.id) ?? null : null,
    };
  }

  function addStory(roomCode, participantToken, storyText) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }
    expireRoomIfHostInactive(room);

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can add a story.');
    }
    requireActiveRoom(room);
    renewHostLease(room, participantToken);

    if (room.status !== 'lobby') {
      throw new RoomStateError('A story is already active.');
    }

    const normalizedStory = typeof storyText === 'string' ? storyText.trim() : '';
    if (!normalizedStory) {
      throw new RoomValidationError('Enter a story to start voting.');
    }

    room.currentStory = { text: normalizedStory };
    room.currentStoryNumber = 1;
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
    expireRoomIfHostInactive(room);

    const participant = room.participants.find(({ token }) => token === participantToken);
    if (!participant) {
      throw new RoomAuthorizationError('A valid participant token is required to vote.');
    }
    requireActiveRoom(room);
    renewHostLease(room, participantToken);

    if (room.status !== 'voting') {
      throw new RoomStateError('Voting is not active.');
    }

    if (typeof value !== 'string' || !DECK_PRESETS[room.deckPreset].includes(value)) {
      throw new RoomValidationError('Choose a card from this room\'s deck.');
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
    expireRoomIfHostInactive(room);

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can reveal estimates.');
    }
    requireActiveRoom(room);
    renewHostLease(room, participantToken);

    if (room.status !== 'voting') {
      throw new RoomStateError('Estimates can only be revealed while voting is active.');
    }

    const roundNumber = room.history.filter(
      (round) => round.storyNumber === room.currentStoryNumber,
    ).length + 1;
    room.history.push({
      storyNumber: room.currentStoryNumber,
      roundNumber,
      story: { ...room.currentStory },
      participants: room.participants.map(({ id, label, role }) => ({
        id,
        label,
        role,
        vote: room.votes.get(id) ?? null,
      })),
    });
    room.status = 'revealed';
    return toPublicRoom(room);
  }

  function restartVoting(roomCode, participantToken) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }
    expireRoomIfHostInactive(room);

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can start a revote.');
    }
    requireActiveRoom(room);
    renewHostLease(room, participantToken);

    if (room.status !== 'revealed') {
      throw new RoomStateError('A revote can only start after estimates are revealed.');
    }

    room.votes = new Map();
    room.status = 'voting';
    return toPublicRoom(room);
  }

  function startNextStory(roomCode, participantToken, storyText) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }
    expireRoomIfHostInactive(room);

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can start the next story.');
    }
    requireActiveRoom(room);
    renewHostLease(room, participantToken);

    if (room.status !== 'revealed') {
      throw new RoomStateError('The next story can only start after estimates are revealed.');
    }

    const normalizedStory = typeof storyText === 'string' ? storyText.trim() : '';
    if (!normalizedStory) {
      throw new RoomValidationError('Enter the next story to start voting.');
    }

    room.currentStory = { text: normalizedStory };
    room.currentStoryNumber += 1;
    room.votes = new Map();
    room.status = 'voting';
    return toPublicRoom(room);
  }

  function endRoom(roomCode, participantToken) {
    const normalizedCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    const room = rooms.get(normalizedCode);
    if (!room) {
      throw new RoomNotFoundError('Room not found. Check the code and try again.');
    }
    expireRoomIfHostInactive(room);

    const host = room.participants.find(
      (participant) => participant.token === participantToken && participant.role === 'host',
    );
    if (!host) {
      throw new RoomAuthorizationError('Only the host can end the room.');
    }

    if (room.status !== 'ended') {
      endRoomState(room, 'host-ended');
    }
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
      publicRoom.deck = [...DECK_PRESETS[room.deckPreset]];
    }
    if (room.status === 'ended') {
      publicRoom.endedReason = room.endedReason;
      publicRoom.endedMessage = room.endedMessage;
    }
    if (room.history.length > 0) {
      publicRoom.history = room.history.map((round) => ({
        storyNumber: round.storyNumber,
        roundNumber: round.roundNumber,
        story: { ...round.story },
        participants: round.participants.map((participant) => ({ ...participant })),
      }));
    }
    return publicRoom;
  }

  return {
    createRoom,
    joinRoom,
    restoreSession,
    addStory,
    submitVote,
    revealRound,
    restartVoting,
    startNextStory,
    endRoom,
    getRoom(code, participantToken) {
      const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const room = rooms.get(normalizedCode);
      if (room) {
        expireRoomIfHostInactive(room);
        renewHostLease(room, participantToken);
      }
      return room ? toPublicRoom(room) : undefined;
    },
    get size() {
      return rooms.size;
    },
  };
}

