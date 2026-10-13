async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function createRoom(hostName, deckPreset) {
  return readResponse(
    await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostName, deckPreset }),
    }),
  );
}

export async function joinRoom(roomCode, participantName) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantName }),
    }),
  );
}

export async function getRoom(roomCode, participantToken, { signal } = {}) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, {
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
      signal,
    }),
  );
}

export async function restoreSession(roomCode, participantToken) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/session`, {
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    }),
  );
}

export async function addStory(roomCode, participantToken, storyText) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
      },
      body: JSON.stringify({ storyText }),
    }),
  );
}

export async function submitVote(roomCode, participantToken, value) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/vote`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
      },
      body: JSON.stringify({ value }),
    }),
  );
}

export async function revealEstimates(roomCode, participantToken) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/reveal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    }),
  );
}

export async function startRevote(roomCode, participantToken) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/revote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    }),
  );
}

export async function startNextStory(roomCode, participantToken, storyText) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/next-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
      },
      body: JSON.stringify({ storyText }),
    }),
  );
}

export async function endRoom(roomCode, participantToken) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    }),
  );
}

export async function leaveRoom(roomCode, participantToken) {
  return readResponse(
    await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/leave`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    }),
  );
}

