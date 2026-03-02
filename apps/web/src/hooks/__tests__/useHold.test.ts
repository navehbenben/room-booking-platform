import { renderHook, act, waitFor } from '@testing-library/react';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/client', () => ({
  api: { createHold: vi.fn() },
}));

import { useHold } from '../useHold';
import { api } from '../../api/client';

const HOLD = { holdId: 'hold-xyz', expiresAt: '2024-01-01T10:15:00Z' };

describe('useHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('calls api.createHold with the provided params', async () => {
    vi.mocked(api.createHold).mockResolvedValue(HOLD);
    const { result } = renderHook(() => useHold());
    await act(() => result.current.createHold('room-1', '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'));
    expect(api.createHold).toHaveBeenCalledWith({
      roomId: 'room-1',
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
    });
  });

  it('navigates to /checkout/:holdId on success', async () => {
    vi.mocked(api.createHold).mockResolvedValue(HOLD);
    const { result } = renderHook(() => useHold());
    await act(() => result.current.createHold('room-1', '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'));
    expect(mockNavigate).toHaveBeenCalledWith('/checkout/hold-xyz');
  });

  it('sets error when API call fails', async () => {
    vi.mocked(api.createHold).mockRejectedValue({
      error: { message: 'Room already held' },
    });
    const { result } = renderHook(() => useHold());
    await act(() => result.current.createHold('room-1', '2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'));
    expect(result.current.error).toBe('Room already held');
  });

  it('loading is true during createHold, false after', async () => {
    let resolve!: (v: typeof HOLD) => void;
    vi.mocked(api.createHold).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useHold());

    act(() => {
      result.current.createHold('r1', 'start', 'end');
    });
    expect(result.current.loading).toBe(true);

    await act(async () => resolve(HOLD));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('does not navigate when API fails', async () => {
    vi.mocked(api.createHold).mockRejectedValue({ error: { message: 'Error' } });
    const { result } = renderHook(() => useHold());
    await act(() => result.current.createHold('r1', 'start', 'end'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
