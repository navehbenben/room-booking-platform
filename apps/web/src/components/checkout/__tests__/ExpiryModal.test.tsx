import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

import { ExpiryModal } from '../ExpiryModal';

const defaultProps = {
  roomId: 'room-abc',
  start: '2024-06-01T09:00',
  end: '2024-06-01T10:00',
};

describe('ExpiryModal', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('has dialog role and aria-modal', () => {
    render(<ExpiryModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows "Reservation expired" title', () => {
    render(<ExpiryModal {...defaultProps} />);
    expect(screen.getByText('Reservation expired')).toBeInTheDocument();
  });

  it('shows a message about timer ending', () => {
    render(<ExpiryModal {...defaultProps} />);
    expect(screen.getByText(/reservation timer has ended/i)).toBeInTheDocument();
  });

  it('has a button to check availability again', () => {
    render(<ExpiryModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /check availability/i })).toBeInTheDocument();
  });

  it('clicking the button navigates to the room detail page with params', () => {
    render(<ExpiryModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/rooms/room-abc'),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('start='),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('end='),
    );
  });
});
