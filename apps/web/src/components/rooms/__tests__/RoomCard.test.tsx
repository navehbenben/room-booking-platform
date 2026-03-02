import { render, screen, fireEvent } from '@testing-library/react';
import { RoomCard } from '../RoomCard';
import type { Room } from '../../../types';

const makeRoom = (overrides: Partial<Room> = {}): Room => ({
  roomId: 'room-1',
  name: 'Conference Room A',
  capacity: 4,
  features: ['projector', 'whiteboard'],
  status: 'AVAILABLE',
  ...overrides,
});

describe('RoomCard', () => {
  it('renders room name', () => {
    render(<RoomCard room={makeRoom()} onView={vi.fn()} disabled={false} />);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });

  it('shows "Up to X people" for capacity > 1', () => {
    render(<RoomCard room={makeRoom({ capacity: 4 })} onView={vi.fn()} disabled={false} />);
    expect(screen.getByText(/up to 4 people/i)).toBeInTheDocument();
  });

  it('shows "Up to 1 person" for capacity = 1', () => {
    render(<RoomCard room={makeRoom({ capacity: 1 })} onView={vi.fn()} disabled={false} />);
    expect(screen.getByText(/up to 1 person/i)).toBeInTheDocument();
  });

  it('renders feature labels (human-readable)', () => {
    render(
      <RoomCard room={makeRoom({ features: ['projector', 'whiteboard'] })} onView={vi.fn()} disabled={false} />,
    );
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('Whiteboard')).toBeInTheDocument();
  });

  it('renders no features section when features is empty', () => {
    const { container } = render(
      <RoomCard room={makeRoom({ features: [] })} onView={vi.fn()} disabled={false} />,
    );
    expect(container.querySelector('.room-card__features')).not.toBeInTheDocument();
  });

  it('calls onView with roomId when See availability is clicked', () => {
    const onView = vi.fn();
    render(<RoomCard room={makeRoom({ roomId: 'room-42' })} onView={onView} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /see availability/i }));
    expect(onView).toHaveBeenCalledWith('room-42');
  });

  it('See availability button is disabled when disabled=true', () => {
    render(<RoomCard room={makeRoom()} onView={vi.fn()} disabled={true} />);
    expect(screen.getByRole('button', { name: /see availability/i })).toBeDisabled();
  });
});
