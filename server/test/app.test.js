import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createRoomStore } from '../src/rooms.js';

function createTestApplication() {
  const ids = ['123', '456', '789'];
  const tokens = ['host-token', 'participant-token-1', 'participant-token-2'];
  const roomStore = createRoomStore({
    codeGenerator: () => 'ABC123',
    idGenerator: () => ids.shift(),
    tokenGenerator: () => tokens.shift(),
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
      participantToken: 'host-token',
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

describe('room participation endpoints', () => {
  it('joins an existing room and returns synchronized public state', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);

    const joinResponse = await request(app)
      .post('/api/rooms/abc123/participants')
      .send({ participantName: 'Sam' })
      .expect(201);

    expect(joinResponse.body.participantToken).toBe('participant-token-1');
    expect(joinResponse.body.room.participants).toEqual([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant' },
    ]);

    const roomResponse = await request(app).get('/api/rooms/ABC123').expect(200);
    expect(roomResponse.body).toEqual({ room: joinResponse.body.room });
    expect(JSON.stringify(roomResponse.body)).not.toContain('token');
  });

  it('rejects an unknown room code with a useful error', async () => {
    const response = await request(createTestApplication())
      .post('/api/rooms/MISSING/participants')
      .send({ participantName: 'Sam' })
      .expect(404);

    expect(response.body).toEqual({ error: 'Room not found. Check the code and try again.' });
  });

  it('rejects a blank participant name', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);

    const response = await request(app)
      .post('/api/rooms/ABC123/participants')
      .send({ participantName: '   ' })
      .expect(400);

    expect(response.body).toEqual({ error: 'Enter your name to join a room.' });
  });
});

