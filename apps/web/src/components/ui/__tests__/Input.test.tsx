import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders error message when error prop set', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('renders hint when hint prop set and no error', () => {
    render(<Input label="Email" hint="Enter your work email" />);
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
  });

  it('does not render hint when error is present', () => {
    render(<Input label="Email" error="Bad email" hint="Enter your email" />);
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
  });

  it('can be focused via ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input label="Name" ref={ref} />);
    ref.current?.focus();
    expect(document.activeElement).toBe(ref.current);
  });

  it('fires onChange on typing', () => {
    const handleChange = vi.fn();
    render(<Input label="Name" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
