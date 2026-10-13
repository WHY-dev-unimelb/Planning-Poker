import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

function successfulResponse(data) {
  return {
    ok: true,
    json: async () => data,
  };
}

function roomSession(participants = [
  { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
], roomOverrides = {}) {
  const room = {
    code: 'ABC123',
    status: 'lobby',
    participants,
    ...roomOverrides,
  };
  if (room.status === 'voting') {
    room.deck ??= ['1', '2', '3', '5', '8', '13', '21', '?'];
    room.participants = room.participants.map((participant) => ({
      hasVoted: false,
      ...participant,
    }));
  }

  return {
    room,
    participantToken: 'private-token',
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('room entry', () => {
  it('creates a room and displays its lobby', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(roomSession()));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), '  Alex  ');
    await user.click(screen.getByRole('button', { name: 'Create room' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/rooms',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hostName: 'Alex', deckPreset: 'fibonacci' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Planning Poker lobby' })).toBeVisible();
    expect(screen.getByText('ABC123')).toBeVisible();
    expect(screen.getByText('Alex #123')).toBeVisible();
    expect(screen.getByText('Host')).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem('planning-poker-session'))).toEqual({
      roomCode: 'ABC123',
      participantToken: 'private-token',
    });
  });

  it('rejects a blank host name before calling the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create room' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name to create a room.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lets the host choose a deck preset that is used for voting', async () => {
    const user = userEvent.setup();
    const tshirtVotingRoom = roomSession(undefined, {
      status: 'voting',
      currentStory: { text: 'Estimate visual polish' },
      deck: ['XS', 'S', 'M', 'L', 'XL', '?'],
    }).room;
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: tshirtVotingRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.selectOptions(screen.getByLabelText('Estimation deck'), 'tshirt');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), 'Estimate visual polish');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/rooms',
      expect.objectContaining({
        body: JSON.stringify({ hostName: 'Alex', deckPreset: 'tshirt' }),
      }),
    );
    expect(await screen.findByRole('button', { name: 'XS' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'XL' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '13' })).not.toBeInTheDocument();
  });

  it('joins a room using an uppercase normalized code', async () => {
    const user = userEvent.setup();
    const joinedSession = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant' },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(joinedSession));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'abc123');
    await user.type(screen.getByLabelText('Your name'), ' Sam ');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/rooms/ABC123/participants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ participantName: 'Sam' }),
      }),
    );
    expect(await screen.findByText('Sam #456')).toBeVisible();
    expect(screen.getByText('Alex #123')).toBeVisible();
  });

  it('shows a useful error when the room does not exist', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Room not found. Check the code and try again.' }),
    });

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Room not found. Check the code and try again.',
    );
  });
});

describe('lobby synchronization', () => {
  it('updates the participant list after polling', async () => {
    const user = userEvent.setup();
    const updatedRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant' },
    ]).room;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValue(successfulResponse({ room: updatedRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    expect(await screen.findByText('Alex #123')).toBeVisible();

    expect(await screen.findByText('Sam #456', {}, { timeout: 2500 })).toBeVisible();
  });

  it('stops polling when the lobby is unmounted', async () => {
    const user = userEvent.setup();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(roomSession()));

    const view = render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    expect(await screen.findByText('Alex #123')).toBeVisible();

    view.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

describe('starting the first story', () => {
  it('lets the host add a story and enter voting', async () => {
    const user = userEvent.setup();
    const votingRoom = roomSession(undefined, {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    }).room;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: votingRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), '  Estimate login flow  ');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/rooms/ABC123/story',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
        body: JSON.stringify({ storyText: 'Estimate login flow' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Voting has started' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Estimate login flow' })).toBeVisible();
  });

  it('does not show story controls to a participant in the lobby', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(roomSession()));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(await screen.findByText('Waiting for the host to add the first story.')).toBeVisible();
    expect(screen.queryByLabelText('Story')).not.toBeInTheDocument();
  });

  it('shows a participant the story after polling', async () => {
    const user = userEvent.setup();
    const votingRoom = roomSession(undefined, {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    }).room;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValue(successfulResponse({ room: votingRoom }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(
      await screen.findByRole('heading', { name: 'Estimate login flow' }, { timeout: 2500 }),
    ).toBeVisible();
  });

  it('rejects a blank story before calling the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(successfulResponse(roomSession()));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), '   ');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a story to start voting.');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('private voting', () => {
  function votingSession(participants) {
    return roomSession(participants, {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    });
  }

  async function joinVotingRoom(user) {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));
    await screen.findByRole('heading', { name: 'Estimate login flow' });
  }

  it('submits a card and lets the participant change it', async () => {
    const user = userEvent.setup();
    const beforeVote = votingSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: false },
    ]);
    const afterVote = votingSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: true },
    ]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(beforeVote))
      .mockResolvedValueOnce(successfulResponse({ room: afterVote.room }))
      .mockResolvedValueOnce(successfulResponse({ room: afterVote.room }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    await user.click(await screen.findByRole('button', { name: '3' }));
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Your selection:/)).toHaveTextContent('Your selection: 3');

    await user.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'true');

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/rooms/ABC123/vote',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
        body: JSON.stringify({ value: '3' }),
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/rooms/ABC123/vote',
      expect.objectContaining({ body: JSON.stringify({ value: '8' }) }),
    );
  });

  it('shows voting status from polling without showing selected values', async () => {
    const user = userEvent.setup();
    const initial = votingSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: false },
    ]);
    const updated = votingSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: true },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: false },
    ]);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(initial))
      .mockResolvedValue(successfulResponse({ room: updated.room }));

    await joinVotingRoom(user);

    expect(await screen.findByText('Voted', {}, { timeout: 2500 })).toBeVisible();
    expect(screen.getByText('Not voted')).toBeVisible();
    expect(screen.queryByText('Alex voted 13')).not.toBeInTheDocument();
  });
});

describe('revealing estimates', () => {
  const votingParticipants = [
    { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
    { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: true },
  ];

  function activeVotingSession() {
    return roomSession(votingParticipants, {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    });
  }

  function revealedRoom() {
    return roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', vote: null },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', vote: '8' },
    ], {
      status: 'revealed',
      currentStory: { text: 'Estimate login flow' },
      deck: ['1', '2', '3', '5', '8', '13', '21', '?'],
    }).room;
  }

  it('lets the host reveal early and displays votes and non-voters', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: activeVotingSession().room }))
      .mockResolvedValueOnce(successfulResponse({ room: revealedRoom() }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), 'Estimate login flow');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));
    await user.click(await screen.findByRole('button', { name: 'Reveal estimates' }));

    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/rooms/ABC123/reveal',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Estimates revealed' })).toBeVisible();

    const results = screen.getByRole('heading', { name: 'Estimates' }).parentElement;
    expect(within(within(results).getByText('Alex #123').closest('li')).getByText('No vote')).toBeVisible();
    expect(within(within(results).getByText('Sam #456').closest('li')).getByText('8')).toBeVisible();
    expect(screen.queryByRole('button', { name: '8' })).not.toBeInTheDocument();
  });

  it('shows a participant the revealed results after polling without reveal controls', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(activeVotingSession()))
      .mockResolvedValue(successfulResponse({ room: revealedRoom() }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(await screen.findByRole('heading', { name: 'Estimate login flow' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reveal estimates' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Estimates revealed' }, { timeout: 2500 }),
    ).toBeVisible();
    expect(screen.getByText('No vote')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Revote' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next story')).not.toBeInTheDocument();
  });
});

describe('revoting', () => {
  it('lets the host restart voting for the same story with clean selections', async () => {
    const user = userEvent.setup();
    const votingRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
    ], {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    }).room;
    const votedRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: true },
    ], {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    }).room;
    const revealedRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', vote: '8' },
    ], {
      status: 'revealed',
      currentStory: { text: 'Estimate login flow' },
      deck: ['1', '2', '3', '5', '8', '13', '21', '?'],
    }).room;
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: votingRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: votedRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: revealedRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: votingRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), 'Estimate login flow');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));
    await user.click(await screen.findByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: 'Reveal estimates' }));
    await user.click(await screen.findByRole('button', { name: 'Revote' }));

    expect(fetchSpy).toHaveBeenNthCalledWith(
      5,
      '/api/rooms/ABC123/revote',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Voting has started' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Estimate login flow' })).toBeVisible();
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Not voted')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Estimates' })).not.toBeInTheDocument();
  });
});

describe('starting the next story', () => {
  function hostRooms() {
    const votingRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
    ], {
      status: 'voting',
      currentStory: { text: 'First story' },
    }).room;
    const revealedRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', vote: '8' },
    ], {
      status: 'revealed',
      currentStory: { text: 'First story' },
      deck: ['1', '2', '3', '5', '8', '13', '21', '?'],
    }).room;
    const nextVotingRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
    ], {
      status: 'voting',
      currentStory: { text: 'Second story' },
    }).room;
    return { votingRoom, revealedRoom, nextVotingRoom };
  }

  it('lets the host replace the revealed story and begin a clean vote', async () => {
    const user = userEvent.setup();
    const { votingRoom, revealedRoom, nextVotingRoom } = hostRooms();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: votingRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: revealedRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: nextVotingRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), 'First story');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));
    await user.click(await screen.findByRole('button', { name: 'Reveal estimates' }));
    await user.type(await screen.findByLabelText('Next story'), '  Second story  ');
    await user.click(screen.getByRole('button', { name: 'Start next story' }));

    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      '/api/rooms/ABC123/next-story',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
        body: JSON.stringify({ storyText: 'Second story' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Voting has started' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Second story' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Estimates' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Not voted')).toBeVisible();
  });

  it('rejects a blank next story before calling the API', async () => {
    const user = userEvent.setup();
    const { votingRoom, revealedRoom } = hostRooms();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successfulResponse(roomSession()))
      .mockResolvedValueOnce(successfulResponse({ room: votingRoom }))
      .mockResolvedValueOnce(successfulResponse({ room: revealedRoom }));

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), 'Alex');
    await user.click(screen.getByRole('button', { name: 'Create room' }));
    await user.type(await screen.findByLabelText('Story'), 'First story');
    await user.click(screen.getByRole('button', { name: 'Add story and start voting' }));
    await user.click(await screen.findByRole('button', { name: 'Reveal estimates' }));
    await user.type(await screen.findByLabelText('Next story'), '   ');
    await user.click(screen.getByRole('button', { name: 'Start next story' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter the next story to start voting.');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

describe('completed round history', () => {
  it('shows earlier revealed rounds to a participant who joins later', async () => {
    const user = userEvent.setup();
    const sessionWithHistory = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: false },
      { id: '789', name: 'Taylor', label: 'Taylor #789', role: 'participant', hasVoted: false },
    ], {
      status: 'voting',
      currentStory: { text: 'Second story' },
      history: [
        {
          storyNumber: 1,
          roundNumber: 1,
          story: { text: 'First story' },
          participants: [
            { id: '123', label: 'Alex #123', role: 'host', vote: '5' },
            { id: '456', label: 'Sam #456', role: 'participant', vote: '8' },
          ],
        },
      ],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(sessionWithHistory));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Taylor');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    const history = await screen.findByRole('heading', { name: 'Round history' });
    const historySection = history.closest('section');
    expect(within(historySection).getByText('Story 1, round 1')).toBeVisible();
    expect(within(historySection).getByRole('heading', { name: 'First story' })).toBeVisible();
    expect(within(historySection).getByText('Sam #456')).toBeVisible();
    expect(within(historySection).getByText('8')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Second story' })).toBeVisible();
  });

  it('does not duplicate the current revealed round in history', async () => {
    const user = userEvent.setup();
    const revealedWithHistory = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', vote: '5' },
    ], {
      status: 'revealed',
      currentStory: { text: 'First story' },
      deck: ['1', '2', '3', '5', '8', '13', '21', '?'],
      history: [
        {
          storyNumber: 1,
          roundNumber: 1,
          story: { text: 'First story' },
          participants: [
            { id: '123', label: 'Alex #123', role: 'host', vote: '5' },
          ],
        },
      ],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse(revealedWithHistory));

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Join a room' }));
    await user.type(screen.getByLabelText('Room code'), 'ABC123');
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Join room' }));

    expect(await screen.findByRole('heading', { name: 'Estimates revealed' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Round history' })).not.toBeInTheDocument();
  });
});

describe('session restoration', () => {
  it('restores the same participant and their private active selection after refresh', async () => {
    sessionStorage.setItem(
      'planning-poker-session',
      JSON.stringify({ roomCode: 'ABC123', participantToken: 'private-token' }),
    );
    const restoredRoom = roomSession([
      { id: '123', name: 'Alex', label: 'Alex #123', role: 'host', hasVoted: true },
      { id: '456', name: 'Sam', label: 'Sam #456', role: 'participant', hasVoted: true },
    ], {
      status: 'voting',
      currentStory: { text: 'Estimate login flow' },
    }).room;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulResponse({
      room: restoredRoom,
      participantToken: 'private-token',
      participantRole: 'participant',
      selectedVote: '8',
    }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Voting has started' })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/rooms/ABC123/session',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
      }),
    );
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Your selection:/)).toHaveTextContent('Your selection: 8');
    expect(screen.queryByRole('button', { name: 'Reveal estimates' })).not.toBeInTheDocument();
  });

  it('clears a stale stored session when the room no longer exists', async () => {
    sessionStorage.setItem(
      'planning-poker-session',
      JSON.stringify({ roomCode: 'OLD123', participantToken: 'stale-token' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Room not found. Check the code and try again.' }),
    });

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your previous room is no longer available. Create or join a room.',
    );
    expect(sessionStorage.getItem('planning-poker-session')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Create a room' })).toBeVisible();
  });
});
