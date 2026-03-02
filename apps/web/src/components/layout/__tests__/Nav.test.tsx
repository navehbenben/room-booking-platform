import { render, screen, fireEvent } from '@testing-library/react';
import { Nav } from '../Nav';

describe('Nav — logged out', () => {
  it('shows Login and Register tabs', () => {
    render(<Nav isLoggedIn={false} tab="login" onTabChange={vi.fn()} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('does not show Search or My Bookings tabs', () => {
    render(<Nav isLoggedIn={false} tab="login" onTabChange={vi.fn()} />);
    expect(screen.queryByText(/Search/)).not.toBeInTheDocument();
    expect(screen.queryByText(/My Bookings/)).not.toBeInTheDocument();
  });

  it('Login tab is active when tab="login"', () => {
    render(<Nav isLoggedIn={false} tab="login" onTabChange={vi.fn()} />);
    expect(screen.getByText('Login')).toHaveClass('nav__tab--active');
    expect(screen.getByText('Register')).not.toHaveClass('nav__tab--active');
  });

  it('Register tab is active when tab="register"', () => {
    render(<Nav isLoggedIn={false} tab="register" onTabChange={vi.fn()} />);
    expect(screen.getByText('Register')).toHaveClass('nav__tab--active');
  });

  it('clicking Register calls onTabChange("register")', () => {
    const onTabChange = vi.fn();
    render(<Nav isLoggedIn={false} tab="login" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Register'));
    expect(onTabChange).toHaveBeenCalledWith('register');
  });
});

describe('Nav — logged in', () => {
  it('shows Search & Book and My Bookings tabs', () => {
    render(<Nav isLoggedIn={true} tab="search" onTabChange={vi.fn()} />);
    expect(screen.getByText('Search & Book')).toBeInTheDocument();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
  });

  it('does not show Login or Register tabs', () => {
    render(<Nav isLoggedIn={true} tab="search" onTabChange={vi.fn()} />);
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
  });

  it('Search tab is active when tab="search"', () => {
    render(<Nav isLoggedIn={true} tab="search" onTabChange={vi.fn()} />);
    expect(screen.getByText('Search & Book')).toHaveClass('nav__tab--active');
  });

  it('My Bookings tab is active when tab="bookings"', () => {
    render(<Nav isLoggedIn={true} tab="bookings" onTabChange={vi.fn()} />);
    expect(screen.getByText('My Bookings')).toHaveClass('nav__tab--active');
  });

  it('clicking My Bookings calls onTabChange("bookings")', () => {
    const onTabChange = vi.fn();
    render(<Nav isLoggedIn={true} tab="search" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('My Bookings'));
    expect(onTabChange).toHaveBeenCalledWith('bookings');
  });
});
