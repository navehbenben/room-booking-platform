import { renderHook, waitFor } from '@testing-library/react';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: vi.fn().mockReturnValue({ roomId: 'room-123' }),
  useSearchParams: vi.fn().mockReturnValue([new URLSearchParams(), vi.fn()]),
}));

vi.mock('../../api/client', () => ({
  api: { roomDetail: vi.fn() },
}));

import { useRoomDetail } from '../useRoomDetail';
import { api } from '../../api/client';
import { useParams } from 'react-router-dom';

const makeRoom = () => ({
  roomId: 'room-123',
  name: 'Conference A',
  capacity: 6,
  features: ['projector'],
  status: 'AVAILABLE',
  description: 'A nice room',
  images: [],
  availabilityStatus: 'AVAILABLE' as const,
});

describe('useRoomDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.roomDetail with the roomId from params', async () => {
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useRoomDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.roomDetail).toHaveBeenCalledWith('room-123', undefined, undefined);
  });

  it('populates room on success', async () => {
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useRoomDetail());
    await waitFor(() => expect(result.current.room).not.toBeNull());
    expect(result.current.room?.name).toBe('Conference A');
  });

  it('sets error on API failure', async () => {
    vi.mocked(api.roomDetail).mockRejectedValue({
      error: { message: 'Room not found' },
    });
    const { result } = renderHook(() => useRoomDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Room not found');
  });

  it('does not call API when roomId is absent', async () => {
    vi.mocked(useParams).mockReturnValueOnce({ roomId: undefined });
    renderHook(() => useRoomDetail());
    await new Promise((r) => setTimeout(r, 10));
    expect(api.roomDetail).not.toHaveBeenCalled();
  });

  it('passes start and end from search params', async () => {
    const { useSearchParams } = await import('react-router-dom');
    vi.mocked(useSearchParams).mockReturnValueOnce([
      new URLSearchParams('start=2024-01-01T10%3A00&end=2024-01-01T11%3A00'),
      vi.fn(),
    ]);
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    renderHook(() => useRoomDetail());
    await waitFor(() => expect(api.roomDetail).toHaveBeenCalled());
    expect(api.roomDetail).toHaveBeenCalledWith('room-123', '2024-01-01T10:00', '2024-01-01T11:00');
  });
});
