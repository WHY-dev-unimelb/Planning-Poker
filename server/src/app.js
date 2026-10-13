import express from 'express';
import { createRoomStore, RoomValidationError } from './rooms.js';

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

  return app;
}

