import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../api/client', () => ({
  api: {
    myBookings: vi.fn(),
    cancelBooking: vi.fn(),
  },
}));

import { useBookings } from '../useBookings';
import { api } from '../../api/client';

const makeBooking = (id: string, status = 'CONFIRMED') => ({
  bookingId: id,
  roomId: 'room1',
  start: '2024-01-01T10:00:00Z',
  end: '2024-01-01T11:00:00Z',
  status,
  createdAt: '2024-01-01T00:00:00Z',
});

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls api.myBookings() on mount', async () => {
    vi.mocked(api.myBookings).mockResolvedValue([]);
    renderHook(() => useBookings());
    await waitFor(() => expect(api.myBookings).toHaveBeenCalledTimes(1));
  });

  it('populates bookings from API response', async () => {
    vi.mocked(api.myBookings).mockResolvedValue([makeBooking('b1'), makeBooking('b2')]);
    const { result } = renderHook(() => useBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookings).toHaveLength(2);
  });

  it('cancel calls api.cancelBooking with the bookingId', async () => {
    vi.mocked(api.myBookings).mockResolvedValue([makeBooking('b1')]);
    vi.mocked(api.cancelBooking).mockResolvedValue({ bookingId: 'b1', status: 'CANCELLED' });
    const { result } = renderHook(() => useBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.cancel('b1'));
    expect(api.cancelBooking).toHaveBeenCalledWith('b1');
  });

  it('cancelled booking status changes to CANCELLED in local state', async () => {
    vi.mocked(api.myBookings).mockResolvedValue([makeBooking('b1'), makeBooking('b2')]);
    vi.mocked(api.cancelBooking).mockResolvedValue({ bookingId: 'b1', status: 'CANCELLED' });
    const { result } = renderHook(() => useBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.cancel('b1'));
    expect(result.current.bookings.find((b) => b.bookingId === 'b1')?.status).toBe('CANCELLED');
    expect(result.current.bookings.find((b) => b.bookingId === 'b2')?.status).toBe('CONFIRMED');
  });
});
