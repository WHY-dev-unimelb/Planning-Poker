import { useState } from 'react';
import { createRoom } from './api.js';

export default function App() {
  const [hostName, setHostName] = useState('');
  const [roomSession, setRoomSession] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const trimmedName = hostName.trim();
    if (!trimmedName) {
      setError('Enter your name to create a room.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await createRoom(trimmedName);
      setRoomSession(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (roomSession) {
    return (
      <main className="page-shell">
        <section className="panel" aria-labelledby="lobby-heading">
          <p className="eyebrow">Room created</p>
          <h1 id="lobby-heading">Planning Poker lobby</h1>
          <p className="room-code-label">Share this room code</p>
          <p className="room-code" aria-label={`Room code ${roomSession.room.code}`}>
            {roomSession.room.code}
          </p>

          <div className="lobby-section">
            <h2>Participants</h2>
            <ul className="participant-list">
              {roomSession.room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.label}</span>
                  {participant.role === 'host' && <span className="role-badge">Host</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel" aria-labelledby="create-room-heading">
        <p className="eyebrow">Planning Poker</p>
        <h1 id="create-room-heading">Create a room</h1>
        <p className="supporting-text">
          Start a lobby, then share its code with your team.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="host-name">Your name</label>
          <input
            id="host-name"
            name="hostName"
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            autoComplete="name"
            maxLength={60}
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating room…' : 'Create room'}
          </button>
        </form>
      </section>
    </main>
  );
}

