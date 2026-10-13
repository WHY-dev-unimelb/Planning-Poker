import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('room creation', () => {
  it('creates a room and displays its lobby', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        room: {
          code: 'ABC123',
          status: 'lobby',
          participants: [
            { id: '123', name: 'Alex', label: 'Alex #123', role: 'host' },
          ],
        },
        participantToken: 'private-token',
      }),
    });

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

  it('rejects a blank name before calling the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<App />);
    await user.type(screen.getByLabelText('Your name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Create room' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name to create a room.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

