import express from 'express';
import {
  createRoomStore,
  RoomNotFoundError,
  RoomValidationError,
} from './rooms.js';

export function createApp({ roomStore = createRoomStore() } = {}) {
  const app = express();
  app.use(express.json());

  app.post('/api/rooms', (request, response) => {
    try {
      const session = roomStore.createRoom(request.body?.hostName);
      response.status(201).json(session);
    } catch (error) {
      if (error instanceof RoomValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to create the room.' });
    }
  });

  app.post('/api/rooms/:roomCode/participants', (request, response) => {
    try {
      const session = roomStore.joinRoom(request.params.roomCode, request.body?.participantName);
      response.status(201).json(session);
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to join the room.' });
    }
  });

  app.get('/api/rooms/:roomCode', (request, response) => {
    const room = roomStore.getRoom(request.params.roomCode);
    if (!room) {
      response.status(404).json({ error: 'Room not found. Check the code and try again.' });
      return;
    }

    response.json({ room });
  });

  return app;
}

