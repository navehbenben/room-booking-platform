import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutForm } from '../CheckoutForm';

describe('CheckoutForm', () => {
  it('renders the form title and fields', () => {
    render(<CheckoutForm onConfirm={vi.fn()} loading={false} />);
    expect(screen.getByText('Your Details')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
  });

  it('shows "Name is required" when submitted without name', async () => {
    render(<CheckoutForm onConfirm={vi.fn()} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    await waitFor(() =>
      expect(screen.getByText('Name is required')).toBeInTheDocument(),
    );
  });

  it('shows "Email is required" when submitted without email', async () => {
    render(<CheckoutForm onConfirm={vi.fn()} loading={false} />);
    fireEvent.change(screen.getByPlaceholderText('Your full name'), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    await waitFor(() =>
      expect(screen.getByText('Email is required')).toBeInTheDocument(),
    );
  });

  it('shows "Invalid email format" for bad email', async () => {
    const { container } = render(<CheckoutForm onConfirm={vi.fn()} loading={false} />);
    fireEvent.change(screen.getByPlaceholderText('Your full name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'not-an-email' },
    });
    // Use fireEvent.submit to bypass jsdom's native type="email" validation
    // so our React validate() function runs and sets the error state.
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() =>
      expect(screen.getByText('Invalid email format')).toBeInTheDocument(),
    );
  });

  it('calls onConfirm with notes when form is valid', async () => {
    const onConfirm = vi.fn();
    render(<CheckoutForm onConfirm={onConfirm} loading={false} />);
    fireEvent.change(screen.getByPlaceholderText('Your full name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requirements...'), {
      target: { value: 'Window seat please' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('Window seat please'),
    );
  });

  it('calls onConfirm with undefined when notes is empty', async () => {
    const onConfirm = vi.fn();
    render(<CheckoutForm onConfirm={onConfirm} loading={false} />);
    fireEvent.change(screen.getByPlaceholderText('Your full name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(undefined),
    );
  });

  it('disables button and shows loading when loading=true', () => {
    render(<CheckoutForm onConfirm={vi.fn()} loading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<CheckoutForm onConfirm={vi.fn()} loading={false} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
