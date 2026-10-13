export async function createRoom(hostName) {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hostName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Unable to create the room.');
  }

  return data;
}

