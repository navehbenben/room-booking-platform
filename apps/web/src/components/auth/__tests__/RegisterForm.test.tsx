import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '../RegisterForm';

const noop = async () => {};

describe('RegisterForm', () => {
  it('renders title and all fields', () => {
    render(<RegisterForm onSuccess={noop} />);
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByText('Full name (optional)')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('submit button is disabled when email is empty', () => {
    render(<RegisterForm onSuccess={noop} />);
    const btn = screen.getByRole('button', { name: /create account/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is disabled when password is shorter than 8 chars', () => {
    render(<RegisterForm onSuccess={noop} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'short' },
    });
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('submit button is enabled when email + password ≥8 chars', () => {
    render(<RegisterForm onSuccess={noop} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password1' },
    });
    expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
  });

  it('calls onSuccess with name, email, password', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Alice', 'alice@example.com', 'password1'));
  });

  it('shows error message when onSuccess rejects', async () => {
    const onSuccess = vi.fn().mockRejectedValue({
      error: { code: 'EMAIL_TAKEN', message: 'Email already in use' },
    });
    render(<RegisterForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
  });
});
