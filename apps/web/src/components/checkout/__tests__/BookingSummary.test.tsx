import { render, screen } from '@testing-library/react';
import { BookingSummary } from '../BookingSummary';
import type { RoomDetail } from '../../../types';

const makeRoom = (overrides: Partial<RoomDetail> = {}): RoomDetail => ({
  roomId: 'room-1',
  name: 'Boardroom',
  capacity: 8,
  features: ['projector', 'whiteboard'],
  status: 'AVAILABLE',
  description: 'A nice room',
  images: [],
  availabilityStatus: 'AVAILABLE',
  ...overrides,
});

describe('BookingSummary', () => {
  it('shows room name', () => {
    render(
      <BookingSummary
        room={makeRoom()}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T10:00:00Z"
      />,
    );
    expect(screen.getByText('Boardroom')).toBeInTheDocument();
  });

  it('shows capacity with plural', () => {
    render(
      <BookingSummary
        room={makeRoom({ capacity: 8 })}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T10:00:00Z"
      />,
    );
    expect(screen.getByText('8 persons')).toBeInTheDocument();
  });

  it('shows capacity singular for 1 person', () => {
    render(
      <BookingSummary
        room={makeRoom({ capacity: 1 })}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T10:00:00Z"
      />,
    );
    expect(screen.getByText('1 person')).toBeInTheDocument();
  });

  it('calculates and shows duration in hours', () => {
    render(
      <BookingSummary
        room={makeRoom()}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T11:30:00Z"
      />,
    );
    expect(screen.getByText('2.5h')).toBeInTheDocument();
  });

  it('shows feature badges', () => {
    render(
      <BookingSummary
        room={makeRoom({ features: ['projector', 'whiteboard'] })}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T10:00:00Z"
      />,
    );
    expect(screen.getByText('projector')).toBeInTheDocument();
    expect(screen.getByText('whiteboard')).toBeInTheDocument();
  });

  it('renders no features section when features is empty', () => {
    const { container } = render(
      <BookingSummary
        room={makeRoom({ features: [] })}
        start="2024-06-01T09:00:00Z"
        end="2024-06-01T10:00:00Z"
      />,
    );
    expect(container.querySelector('.booking-summary__features')).not.toBeInTheDocument();
  });
});
