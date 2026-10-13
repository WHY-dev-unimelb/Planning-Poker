async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'The request could not be completed.');
  }
  return data;
}

export async function createRoom(hostName) {
  return readResponse(
    await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostName }),
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

export async function getRoom(roomCode) {
  return readResponse(await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`));
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

