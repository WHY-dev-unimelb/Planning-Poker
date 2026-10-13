import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createRoomStore } from '../src/rooms.js';

function createTestApplication() {
  const roomStore = createRoomStore({
    codeGenerator: () => 'ABC123',
    idGenerator: () => '123',
    tokenGenerator: () => 'private-token',
  });

  return createApp({ roomStore });
}

describe('POST /api/rooms', () => {
  it('creates a room and returns its host session', async () => {
    const response = await request(createTestApplication())
      .post('/api/rooms')
      .send({ hostName: '  Alex  ' })
      .expect(201);

    expect(response.body).toEqual({
      room: {
        code: 'ABC123',
        status: 'lobby',
        participants: [
          { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
        ],
      },
      participantToken: 'private-token',
    });
  });

  it('returns a useful validation error for a blank name', async () => {
    const response = await request(createTestApplication())
      .post('/api/rooms')
      .send({ hostName: '   ' })
      .expect(400);

    expect(response.body).toEqual({ error: 'Enter your name to create a room.' });
  });
});

