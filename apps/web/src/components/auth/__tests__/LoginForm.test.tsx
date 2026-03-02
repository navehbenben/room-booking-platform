import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

const noop = async () => {};

describe('LoginForm', () => {
  it('renders title and fields', () => {
    render(<LoginForm onSuccess={noop} />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('submit button is disabled when email is empty', () => {
    render(<LoginForm onSuccess={noop} />);
    const btn = screen.getByRole('button', { name: /sign in/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is disabled when password is empty', () => {
    render(<LoginForm onSuccess={noop} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('submit button is enabled when both fields are filled', () => {
    render(<LoginForm onSuccess={noop} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pass' },
    });
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('calls onSuccess with email and password on submit', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('a@b.com', 'secret'));
  });

  it('shows error message when onSuccess rejects', async () => {
    const onSuccess = vi.fn().mockRejectedValue({
      error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' },
    });
    render(<LoginForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('Incorrect email or password. Please try again.')).toBeInTheDocument());
  });

  it('pressing Enter submits when both fields filled', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSuccess={onSuccess} />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passInput = screen.getByPlaceholderText('••••••••');
    fireEvent.change(emailInput, { target: { value: 'a@b.com' } });
    fireEvent.change(passInput, { target: { value: 'pass' } });
    fireEvent.keyDown(emailInput, { key: 'Enter' });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
