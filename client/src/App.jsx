import { useEffect, useState } from 'react';
import {
  addStory,
  createRoom,
  getRoom,
  joinRoom,
  revealEstimates,
  startNextStory,
  startRevote,
  submitVote,
} from './api.js';

const POLLING_INTERVAL_MS = 1000;
const DECK_PRESET_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci — 1, 2, 3, 5, 8, 13, 21, ?' },
  { value: 'tshirt', label: 'T-shirt — XS, S, M, L, XL, ?' },
  { value: 'powers-of-two', label: 'Powers of two — 1, 2, 4, 8, 16, 32, ?' },
];

export default function App() {
  const [mode, setMode] = useState('create');
  const [hostName, setHostName] = useState('');
  const [deckPreset, setDeckPreset] = useState('fibonacci');
  const [participantName, setParticipantName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomSession, setRoomSession] = useState(null);
  const [viewerRole, setViewerRole] = useState(null);
  const [entryMessage, setEntryMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyError, setStoryError] = useState('');
  const [isStartingStory, setIsStartingStory] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [voteError, setVoteError] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [revealError, setRevealError] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [roundActionError, setRoundActionError] = useState('');
  const [isRestartingVote, setIsRestartingVote] = useState(false);
  const [nextStoryText, setNextStoryText] = useState('');
  const [nextStoryError, setNextStoryError] = useState('');
  const [isStartingNextStory, setIsStartingNextStory] = useState(false);

  useEffect(() => {
    if (!roomSession) {
      return undefined;
    }

    let isActive = true;
    const intervalId = setInterval(async () => {
      try {
        const latest = await getRoom(roomSession.room.code);
        if (isActive) {
          setRoomSession((current) => ({ ...current, room: latest.room }));
        }
      } catch {
        // Keep the last good room state until unavailable-room handling is implemented.
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [roomSession?.room.code]);

  useEffect(() => {
    if (roomSession?.room.status === 'voting') {
      setSelectedVote(null);
    }
  }, [roomSession?.room.status]);

  function chooseMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  async function submit(action, role) {
    setError('');
    setIsSubmitting(true);
    try {
      const session = await action();
      setRoomSession(session);
      setViewerRole(role);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const trimmedName = hostName.trim();
    if (!trimmedName) {
      setError('Enter your name to create a room.');
      return;
    }

    setEntryMessage('Room created');
    await submit(() => createRoom(trimmedName, deckPreset), 'host');
  }

  async function handleJoin(event) {
    event.preventDefault();
    const normalizedCode = roomCode.trim().toUpperCase();
    const trimmedName = participantName.trim();
    if (!normalizedCode) {
      setError('Enter a room code.');
      return;
    }
    if (!trimmedName) {
      setError('Enter your name to join a room.');
      return;
    }

    setEntryMessage('Room joined');
    await submit(() => joinRoom(normalizedCode, trimmedName), 'participant');
  }

  async function handleAddStory(event) {
    event.preventDefault();
    const normalizedStory = storyText.trim();
    if (!normalizedStory) {
      setStoryError('Enter a story to start voting.');
      return;
    }

    setStoryError('');
    setIsStartingStory(true);
    try {
      const latest = await addStory(
        roomSession.room.code,
        roomSession.participantToken,
        normalizedStory,
      );
      setRoomSession((current) => ({ ...current, room: latest.room }));
    } catch (requestError) {
      setStoryError(requestError.message);
    } finally {
      setIsStartingStory(false);
    }
  }

  async function handleVote(value) {
    setVoteError('');
    setIsSubmittingVote(true);
    try {
      const latest = await submitVote(
        roomSession.room.code,
        roomSession.participantToken,
        value,
      );
      setSelectedVote(value);
      setRoomSession((current) => ({ ...current, room: latest.room }));
    } catch (requestError) {
      setVoteError(requestError.message);
    } finally {
      setIsSubmittingVote(false);
    }
  }

  async function handleReveal() {
    setRevealError('');
    setIsRevealing(true);
    try {
      const latest = await revealEstimates(
        roomSession.room.code,
        roomSession.participantToken,
      );
      setRoomSession((current) => ({ ...current, room: latest.room }));
    } catch (requestError) {
      setRevealError(requestError.message);
    } finally {
      setIsRevealing(false);
    }
  }

  async function handleRevote() {
    setRoundActionError('');
    setIsRestartingVote(true);
    try {
      const latest = await startRevote(
        roomSession.room.code,
        roomSession.participantToken,
      );
      setSelectedVote(null);
      setRoomSession((current) => ({ ...current, room: latest.room }));
    } catch (requestError) {
      setRoundActionError(requestError.message);
    } finally {
      setIsRestartingVote(false);
    }
  }

  async function handleNextStory(event) {
    event.preventDefault();
    const normalizedStory = nextStoryText.trim();
    if (!normalizedStory) {
      setNextStoryError('Enter the next story to start voting.');
      return;
    }

    setNextStoryError('');
    setIsStartingNextStory(true);
    try {
      const latest = await startNextStory(
        roomSession.room.code,
        roomSession.participantToken,
        normalizedStory,
      );
      setSelectedVote(null);
      setNextStoryText('');
      setRoomSession((current) => ({ ...current, room: latest.room }));
    } catch (requestError) {
      setNextStoryError(requestError.message);
    } finally {
      setIsStartingNextStory(false);
    }
  }

  if (roomSession) {
    const isVoting = roomSession.room.status === 'voting';
    const isRevealed = roomSession.room.status === 'revealed';
    return (
      <main className="page-shell">
        <section className="panel" aria-labelledby="room-heading">
          <p className="eyebrow">
            {isVoting ? 'Voting' : isRevealed ? 'Round revealed' : entryMessage}
          </p>
          <h1 id="room-heading">
            {isVoting
              ? 'Voting has started'
              : isRevealed
                ? 'Estimates revealed'
                : 'Planning Poker lobby'}
          </h1>
          <p className="room-code-label">Room code</p>
          <p className="room-code" aria-label={`Room code ${roomSession.room.code}`}>
            {roomSession.room.code}
          </p>

          {isVoting ? (
            <>
              <div className="story-section">
                <p className="section-label">Current story</p>
                <h2>{roomSession.room.currentStory.text}</h2>
              </div>
              <fieldset className="card-picker" disabled={isSubmittingVote}>
                <legend>Choose your estimate</legend>
                <div className="card-grid">
                  {roomSession.room.deck.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="estimate-card"
                      aria-pressed={selectedVote === value}
                      onClick={() => handleVote(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
              {selectedVote && (
                <p className="own-vote">
                  Your selection: <strong>{selectedVote}</strong>
                </p>
              )}
              <FormMessage error={voteError} />
              {viewerRole === 'host' && (
                <div className="reveal-actions">
                  <button type="button" onClick={handleReveal} disabled={isRevealing}>
                    {isRevealing ? 'Revealing…' : 'Reveal estimates'}
                  </button>
                  <FormMessage error={revealError} />
                </div>
              )}
            </>
          ) : isRevealed ? (
            <>
              <div className="story-section">
                <p className="section-label">Current story</p>
                <h2>{roomSession.room.currentStory.text}</h2>
              </div>
              <div className="results-section">
                <h2>Estimates</h2>
                <ul className="results-list">
                  {roomSession.room.participants.map((participant) => (
                    <li key={participant.id}>
                      <span>{participant.label}</span>
                      <strong>{participant.vote ?? 'No vote'}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              {viewerRole === 'host' && (
                <div className="round-actions">
                  <button type="button" onClick={handleRevote} disabled={isRestartingVote}>
                    {isRestartingVote ? 'Starting revote…' : 'Revote'}
                  </button>
                  <FormMessage error={roundActionError} />
                  <form className="next-story-form" onSubmit={handleNextStory} noValidate>
                    <label htmlFor="next-story-text">Next story</label>
                    <textarea
                      id="next-story-text"
                      name="nextStoryText"
                      value={nextStoryText}
                      onChange={(event) => setNextStoryText(event.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                    <FormMessage error={nextStoryError} />
                    <button type="submit" disabled={isStartingNextStory}>
                      {isStartingNextStory ? 'Starting next story…' : 'Start next story'}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : viewerRole === 'host' ? (
            <form className="story-form" onSubmit={handleAddStory} noValidate>
              <label htmlFor="story-text">Story</label>
              <textarea
                id="story-text"
                name="storyText"
                value={storyText}
                onChange={(event) => setStoryText(event.target.value)}
                maxLength={500}
                rows={4}
              />
              <FormMessage error={storyError} />
              <button type="submit" disabled={isStartingStory}>
                {isStartingStory ? 'Starting voting…' : 'Add story and start voting'}
              </button>
            </form>
          ) : (
            <p className="waiting-message">Waiting for the host to add the first story.</p>
          )}

          <div className="lobby-section">
            <h2>Participants</h2>
            <ul className="participant-list">
              {roomSession.room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.label}</span>
                  <span className="participant-badges">
                    {participant.role === 'host' && <span className="role-badge">Host</span>}
                    {isVoting && (
                      <span className={participant.hasVoted ? 'vote-status voted' : 'vote-status'}>
                        {participant.hasVoted ? 'Voted' : 'Not voted'}
                      </span>
                    )}
                  </span>
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
      <section className="panel" aria-labelledby="room-action-heading">
        <p className="eyebrow">Planning Poker</p>
        <div className="mode-switch" aria-label="Room action">
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === 'create'}
            onClick={() => chooseMode('create')}
          >
            Start a room
          </button>
          <button
            type="button"
            className="mode-button"
            aria-pressed={mode === 'join'}
            onClick={() => chooseMode('join')}
          >
            Join a room
          </button>
        </div>

        {mode === 'create' ? (
          <>
            <h1 id="room-action-heading">Create a room</h1>
            <p className="supporting-text">Start a lobby, then share its code with your team.</p>
            <form onSubmit={handleCreate} noValidate>
              <label htmlFor="host-name">Your name</label>
              <input
                id="host-name"
                name="hostName"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                autoComplete="name"
                maxLength={60}
              />
              <label htmlFor="deck-preset">Estimation deck</label>
              <select
                id="deck-preset"
                name="deckPreset"
                value={deckPreset}
                onChange={(event) => setDeckPreset(event.target.value)}
              >
                {DECK_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FormMessage error={error} />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating room…' : 'Create room'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 id="room-action-heading">Join a room</h1>
            <p className="supporting-text">Enter the room code shared by your host.</p>
            <form onSubmit={handleJoin} noValidate>
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                name="roomCode"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                autoComplete="off"
                maxLength={6}
              />
              <label htmlFor="participant-name">Your name</label>
              <input
                id="participant-name"
                name="participantName"
                value={participantName}
                onChange={(event) => setParticipantName(event.target.value)}
                autoComplete="name"
                maxLength={60}
              />
              <FormMessage error={error} />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Joining room…' : 'Join room'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function FormMessage({ error }) {
  if (!error) {
    return null;
  }

  return (
    <p className="error-message" role="alert">
      {error}
    </p>
  );
}
