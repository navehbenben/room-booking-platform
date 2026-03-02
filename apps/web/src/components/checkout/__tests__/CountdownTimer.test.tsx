import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from '../CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('displays remaining time in MM:SS format', () => {
    const expiresAt = new Date(Date.now() + 330_000).toISOString(); // 5m30s
    render(<CountdownTimer expiresAt={expiresAt} />);
    expect(screen.getByText('05:30')).toBeInTheDocument();
  });

  it('shows "00:00" when time has already expired', () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    render(<CountdownTimer expiresAt={expiresAt} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('applies warning class when remaining < 60 seconds', () => {
    const expiresAt = new Date(Date.now() + 59_000).toISOString();
    const { container } = render(<CountdownTimer expiresAt={expiresAt} />);
    expect(container.querySelector('.countdown--warning')).toBeInTheDocument();
  });

  it('does not apply warning class when remaining >= 60 seconds', () => {
    const expiresAt = new Date(Date.now() + 120_000).toISOString();
    const { container } = render(<CountdownTimer expiresAt={expiresAt} />);
    expect(container.querySelector('.countdown--warning')).not.toBeInTheDocument();
  });

  it('counts down each second', () => {
    const expiresAt = new Date(Date.now() + 62_000).toISOString(); // 01:02
    render(<CountdownTimer expiresAt={expiresAt} />);
    expect(screen.getByText('01:02')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('01:01')).toBeInTheDocument();
  });

  it('clamps to 00:00 and does not go negative', () => {
    const expiresAt = new Date(Date.now() + 1000).toISOString();
    render(<CountdownTimer expiresAt={expiresAt} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('shows label text', () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    render(<CountdownTimer expiresAt={expiresAt} />);
    expect(screen.getByText('Reservation expires in')).toBeInTheDocument();
  });
});
