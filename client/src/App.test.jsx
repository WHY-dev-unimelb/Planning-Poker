import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
        body: JSON.stringify({ hostName: 'Alex' }),
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Planning Poker lobby' })).toBeVisible();
    expect(screen.getByText('ABC123')).toBeVisible();
    expect(screen.getByText('Alex #123')).toBeVisible();
    expect(screen.getByText('Host')).toBeVisible();
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
