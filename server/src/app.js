import express from 'express';
import {
  createRoomStore,
  RoomAuthorizationError,
  RoomNotFoundError,
  RoomStateError,
  RoomValidationError,
} from './rooms.js';

function getBearerToken(request) {
  const authorization = request.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
}

export function createApp({ roomStore = createRoomStore() } = {}) {
  const app = express();
  app.use(express.json());

  app.post('/api/rooms', (request, response) => {
    try {
      const session = roomStore.createRoom(request.body?.hostName, request.body?.deckPreset);
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
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to join the room.' });
    }
  });

  app.get('/api/rooms/:roomCode', (request, response) => {
    const room = roomStore.getRoom(request.params.roomCode, getBearerToken(request));
    if (!room) {
      response.status(404).json({ error: 'Room not found. Check the code and try again.' });
      return;
    }

    response.json({ room });
  });

  app.get('/api/rooms/:roomCode/session', (request, response) => {
    try {
      const session = roomStore.restoreSession(
        request.params.roomCode,
        getBearerToken(request),
      );
      response.json(session);
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to restore the participant session.' });
    }
  });

  app.post('/api/rooms/:roomCode/story', (request, response) => {
    try {
      const room = roomStore.addStory(
        request.params.roomCode,
        getBearerToken(request),
        request.body?.storyText,
      );
      response.status(201).json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof RoomValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to add the story.' });
    }
  });

  app.put('/api/rooms/:roomCode/vote', (request, response) => {
    try {
      const result = roomStore.submitVote(
        request.params.roomCode,
        getBearerToken(request),
        request.body?.value,
      );
      response.json({ room: result.room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof RoomValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to submit the vote.' });
    }
  });

  app.post('/api/rooms/:roomCode/reveal', (request, response) => {
    try {
      const room = roomStore.revealRound(
        request.params.roomCode,
        getBearerToken(request),
      );
      response.json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to reveal estimates.' });
    }
  });

  app.post('/api/rooms/:roomCode/revote', (request, response) => {
    try {
      const room = roomStore.restartVoting(
        request.params.roomCode,
        getBearerToken(request),
      );
      response.json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to start a revote.' });
    }
  });

  app.post('/api/rooms/:roomCode/next-story', (request, response) => {
    try {
      const room = roomStore.startNextStory(
        request.params.roomCode,
        getBearerToken(request),
        request.body?.storyText,
      );
      response.status(201).json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }
      if (error instanceof RoomValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof RoomStateError) {
        response.status(409).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to start the next story.' });
    }
  });

  app.post('/api/rooms/:roomCode/end', (request, response) => {
    try {
      const room = roomStore.endRoom(
        request.params.roomCode,
        getBearerToken(request),
      );
      response.json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to end the room.' });
    }
  });

  app.post('/api/rooms/:roomCode/leave', (request, response) => {
    try {
      const room = roomStore.leaveRoom(
        request.params.roomCode,
        getBearerToken(request),
      );
      response.json({ room });
    } catch (error) {
      if (error instanceof RoomNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof RoomAuthorizationError) {
        response.status(403).json({ error: error.message });
        return;
      }

      response.status(500).json({ error: 'Unable to leave the room.' });
    }
  });

  return app;
}

