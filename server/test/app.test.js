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

describe('POST /api/rooms/:roomCode/story', () => {
  it('lets the host add a story and starts voting', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);

    const response = await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: '  Estimate login flow  ' })
      .expect(201);

    expect(response.body.room).toEqual({
      code: 'ABC123',
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
      deck: ['1', '2', '3', '5', '8', '13', '21', '?'],
      participants: [
        {
          id: '123',
          name: 'Alex',
          label: 'Alex #123',
          role: 'host',
          hasVoted: false,
        },
      ],
    });
  });

  it('forbids participant and invalid tokens', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);
    const join = await request(app)
      .post('/api/rooms/ABC123/participants')
      .send({ participantName: 'Sam' })
      .expect(201);

    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', `Bearer ${join.body.participantToken}`)
      .send({ storyText: 'A story' })
      .expect(403);

    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer invalid-token')
      .send({ storyText: 'A story' })
      .expect(403);
  });

  it('rejects a blank story', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);

    const response = await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: '   ' })
      .expect(400);

    expect(response.body).toEqual({ error: 'Enter a story to start voting.' });
  });
});

describe('PUT /api/rooms/:roomCode/vote', () => {
  async function createVotingRoom(app) {
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);
    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: 'Estimate login flow' })
      .expect(201);
  }

  it('accepts every fixed deck value and keeps selected values out of room state', async () => {
    const app = createTestApplication();
    await createVotingRoom(app);

    for (const value of ['1', '2', '3', '5', '8', '13', '21', '?']) {
      const response = await request(app)
        .put('/api/rooms/ABC123/vote')
        .set('Authorization', 'Bearer host-token')
        .send({ value })
        .expect(200);

      expect(response.body.room.participants[0].hasVoted).toBe(true);
      expect(response.body.room).not.toHaveProperty('votes');
      expect(response.body.room.participants[0]).not.toHaveProperty('vote');
    }

    const publicResponse = await request(app).get('/api/rooms/ABC123').expect(200);
    expect(publicResponse.body.room).not.toHaveProperty('votes');
    expect(publicResponse.body.room.participants[0]).toEqual(
      expect.objectContaining({ hasVoted: true }),
    );
    expect(publicResponse.body.room.participants[0]).not.toHaveProperty('vote');
  });

  it('rejects an invalid card value', async () => {
    const app = createTestApplication();
    await createVotingRoom(app);

    const response = await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', 'Bearer host-token')
      .send({ value: '100' })
      .expect(400);

    expect(response.body).toEqual({ error: 'Choose a card from the Planning Poker deck.' });
  });

  it('rejects an invalid participant token', async () => {
    const app = createTestApplication();
    await createVotingRoom(app);

    const response = await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', 'Bearer invalid-token')
      .send({ value: '5' })
      .expect(403);

    expect(response.body).toEqual({ error: 'A valid participant token is required to vote.' });
  });
});

describe('POST /api/rooms/:roomCode/reveal', () => {
  async function prepareRoom(app) {
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);
    const join = await request(app)
      .post('/api/rooms/ABC123/participants')
      .send({ participantName: 'Sam' })
      .expect(201);
    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: 'Estimate login flow' })
      .expect(201);
    return join.body.participantToken;
  }

  it('lets the host reveal before everyone votes and exposes explicit results', async () => {
    const app = createTestApplication();
    const participantToken = await prepareRoom(app);
    await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ value: '8' })
      .expect(200);

    const response = await request(app)
      .post('/api/rooms/ABC123/reveal')
      .set('Authorization', 'Bearer host-token')
      .expect(200);

    expect(response.body.room.status).toBe('revealed');
    expect(response.body.room.participants).toEqual([
      expect.objectContaining({ label: 'Alex #123', vote: null }),
      expect.objectContaining({ label: 'Sam #456', vote: '8' }),
    ]);
  });

  it('forbids participants from revealing', async () => {
    const app = createTestApplication();
    const participantToken = await prepareRoom(app);

    const response = await request(app)
      .post('/api/rooms/ABC123/reveal')
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(403);

    expect(response.body).toEqual({ error: 'Only the host can reveal estimates.' });
  });

  it('rejects voting after reveal', async () => {
    const app = createTestApplication();
    const participantToken = await prepareRoom(app);
    await request(app)
      .post('/api/rooms/ABC123/reveal')
      .set('Authorization', 'Bearer host-token')
      .expect(200);

    const response = await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ value: '13' })
      .expect(409);

    expect(response.body).toEqual({ error: 'Voting is not active.' });
  });
});

describe('POST /api/rooms/:roomCode/revote', () => {
  async function prepareRevealedRoom(app) {
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);
    const join = await request(app)
      .post('/api/rooms/ABC123/participants')
      .send({ participantName: 'Sam' })
      .expect(201);
    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: 'Estimate login flow' })
      .expect(201);
    await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', `Bearer ${join.body.participantToken}`)
      .send({ value: '8' })
      .expect(200);
    await request(app)
      .post('/api/rooms/ABC123/reveal')
      .set('Authorization', 'Bearer host-token')
      .expect(200);
    return join.body.participantToken;
  }

  it('lets the host restart a clean vote for the same story', async () => {
    const app = createTestApplication();
    const participantToken = await prepareRevealedRoom(app);

    const response = await request(app)
      .post('/api/rooms/ABC123/revote')
      .set('Authorization', 'Bearer host-token')
      .expect(200);

    expect(response.body.room.status).toBe('voting');
    expect(response.body.room.currentStory).toEqual({ text: 'Estimate login flow' });
    expect(response.body.room.participants.every(({ hasVoted }) => !hasVoted)).toBe(true);
    expect(response.body.room.participants.every((participant) => !('vote' in participant))).toBe(true);

    await request(app)
      .put('/api/rooms/ABC123/vote')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ value: '13' })
      .expect(200);
  });

  it('rejects revote before reveal', async () => {
    const app = createTestApplication();
    await request(app).post('/api/rooms').send({ hostName: 'Alex' }).expect(201);
    await request(app)
      .post('/api/rooms/ABC123/story')
      .set('Authorization', 'Bearer host-token')
      .send({ storyText: 'Estimate login flow' })
      .expect(201);

    await request(app)
      .post('/api/rooms/ABC123/revote')
      .set('Authorization', 'Bearer host-token')
      .expect(409);
  });

  it('forbids a participant from starting a revote', async () => {
    const app = createTestApplication();
    const participantToken = await prepareRevealedRoom(app);

    await request(app)
      .post('/api/rooms/ABC123/revote')
      .set('Authorization', `Bearer ${participantToken}`)
      .expect(403);
  });
});

