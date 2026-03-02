import { render, screen, fireEvent } from '@testing-library/react';
import { BookingCard } from '../BookingCard';
import type { Booking } from '../../../types';

const makeBooking = (status: string): Booking => ({
  bookingId: 'booking-1',
  roomId: 'room-abcdefgh-1234',
  start: '2024-06-01T10:00:00Z',
  end: '2024-06-01T11:00:00Z',
  status,
  createdAt: '2024-05-01T09:00:00Z',
});

describe('BookingCard', () => {
  it('shows roomName when provided', () => {
    const booking = { ...makeBooking('CONFIRMED'), roomName: 'Zenith Suite' };
    render(<BookingCard booking={booking} cancellingId={null} onCancel={vi.fn()} />);
    expect(screen.getByText('Zenith Suite')).toBeInTheDocument();
  });

  it('falls back to truncated room ID when roomName is absent', () => {
    render(<BookingCard booking={makeBooking('CONFIRMED')} cancellingId={null} onCancel={vi.fn()} />);
    // roomId = 'room-abcdefgh-1234' → slice(0,8) = 'room-abc'
    expect(screen.getByText('Room #room-abc')).toBeInTheDocument();
  });

  it('shows a success badge for CONFIRMED status', () => {
    render(<BookingCard booking={makeBooking('CONFIRMED')} cancellingId={null} onCancel={vi.fn()} />);
    const badge = screen.getByText('CONFIRMED');
    expect(badge).toHaveClass('badge--success');
  });

  it('shows a cancelled badge for CANCELLED status', () => {
    render(<BookingCard booking={makeBooking('CANCELLED')} cancellingId={null} onCancel={vi.fn()} />);
    const badge = screen.getByText('CANCELLED');
    expect(badge).toHaveClass('badge--cancelled');
  });

  it('shows a neutral badge for unknown status', () => {
    render(<BookingCard booking={makeBooking('PENDING')} cancellingId={null} onCancel={vi.fn()} />);
    expect(screen.getByText('PENDING')).toHaveClass('badge--neutral');
  });

  it('shows Cancel button only for CONFIRMED bookings', () => {
    render(<BookingCard booking={makeBooking('CONFIRMED')} cancellingId={null} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('hides Cancel button for CANCELLED bookings', () => {
    render(<BookingCard booking={makeBooking('CANCELLED')} cancellingId={null} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });

  it('Cancel button is in loading state when cancellingId matches bookingId', () => {
    render(
      <BookingCard
        booking={makeBooking('CONFIRMED')}
        cancellingId="booking-1"
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('clicking Cancel calls onCancel with the bookingId', () => {
    const onCancel = vi.fn();
    render(<BookingCard booking={makeBooking('CONFIRMED')} cancellingId={null} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    expect(onCancel).toHaveBeenCalledWith('booking-1');
  });
});
