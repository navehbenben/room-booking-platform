import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: vi.fn().mockReturnValue({ holdId: 'hold-123' }),
}));

vi.mock('../../api/client', () => ({
  api: {
    getHold: vi.fn(),
    roomDetail: vi.fn(),
    createBookingWithHold: vi.fn(),
  },
}));

import { useCheckout } from '../useCheckout';
import { api } from '../../api/client';

const futureExpiry = () => new Date(Date.now() + 600_000).toISOString(); // 10 min
const pastExpiry = () => new Date(Date.now() - 1000).toISOString();

const makeHold = (expiresAt = futureExpiry()) => ({
  holdId: 'hold-123',
  roomId: 'room-456',
  start: '2024-06-01T10:00:00Z',
  end: '2024-06-01T11:00:00Z',
  expiresAt,
});

const makeRoom = () => ({
  roomId: 'room-456',
  name: 'Room A',
  capacity: 4,
  features: [],
  status: 'AVAILABLE',
  description: '',
  images: [],
  availabilityStatus: 'AVAILABLE' as const,
});

describe('useCheckout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.getHold with the holdId from params on mount', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getHold).toHaveBeenCalledWith('hold-123');
  });

  it('sets hold and room on successful load', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hold?.holdId).toBe('hold-123');
    expect(result.current.room?.name).toBe('Room A');
  });

  it('sets expired=true when hold expiresAt is already in the past', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold(pastExpiry()));
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.expired).toBe(true);
  });

  it('sets expired=true when API returns HOLD_EXPIRED error code', async () => {
    vi.mocked(api.getHold).mockRejectedValue({ error: { code: 'HOLD_EXPIRED', message: 'Expired' } });
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.expired).toBe(true);
  });

  it('sets error when API fails with a non-HOLD_EXPIRED error', async () => {
    vi.mocked(api.getHold).mockRejectedValue({ error: { code: 'NOT_FOUND', message: 'Hold not found' } });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Hold not found');
  });

  it('confirm() calls api.createBookingWithHold with holdId and notes', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    vi.mocked(api.createBookingWithHold).mockResolvedValue({ bookingId: 'b-1', status: 'CONFIRMED' });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.confirm('window seat'));
    expect(api.createBookingWithHold).toHaveBeenCalledWith('hold-123', 'window seat');
  });

  it('confirm() sets bookingId on success', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    vi.mocked(api.createBookingWithHold).mockResolvedValue({ bookingId: 'booking-999', status: 'CONFIRMED' });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.confirm());
    expect(result.current.bookingId).toBe('booking-999');
  });

  it('confirm() sets error on failure', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockResolvedValue(makeRoom());
    vi.mocked(api.createBookingWithHold).mockRejectedValue({
      error: { message: 'Booking conflict' },
    });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.confirm());
    expect(result.current.error).toBe('Booking conflict');
  });

  it('room load failure is non-fatal — hold still populated', async () => {
    vi.mocked(api.getHold).mockResolvedValue(makeHold());
    vi.mocked(api.roomDetail).mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hold).not.toBeNull();
    expect(result.current.room).toBeNull();
  });
});
