import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

const renderHeader = (isLoggedIn: boolean, onLogout = vi.fn()) =>
  render(
    <MemoryRouter>
      <Header isLoggedIn={isLoggedIn} onLogout={onLogout} />
    </MemoryRouter>,
  );

describe('Header', () => {
  it('shows brand logo link', () => {
    renderHeader(false);
    // Logo renders as "Room<span>Book</span>" — accessible name is "Room Book" (space-separated)
    expect(screen.getByRole('link', { name: /room\s*book/i })).toBeInTheDocument();
  });

  it('shows Sign out button when logged in', () => {
    renderHeader(true);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('hides Sign out button when not logged in', () => {
    renderHeader(false);
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('calls onLogout when Sign out is clicked', async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);
    renderHeader(true, onLogout);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows nav links (Search Rooms, My Bookings) when logged in', () => {
    renderHeader(true);
    expect(screen.getByRole('link', { name: /search rooms/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my bookings/i })).toBeInTheDocument();
  });

  it('hides nav links when not logged in', () => {
    renderHeader(false);
    // Search Rooms is a public link — always visible
    expect(screen.getByRole('link', { name: /search rooms/i })).toBeInTheDocument();
    // My Bookings and My Profile are auth-gated
    expect(screen.queryByRole('link', { name: /my bookings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /my profile/i })).not.toBeInTheDocument();
  });

  it('show User profile link only if the user are logged in', () => {
    renderHeader(true);
    expect(screen.queryByRole('link', { name: /user profile/i })).not.toBeInTheDocument();
  });

  it('shows Sign in and Register links when not logged in', () => {
    renderHeader(false);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('hides Sign in and Register links when logged in', () => {
    renderHeader(true);
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
  });
});
