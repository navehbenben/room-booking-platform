import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const svg = screen.getByTestId('spinner');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('renders with custom size', () => {
    render(<Spinner size={24} />);
    const svg = screen.getByTestId('spinner');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('has aria-hidden to hide from screen readers', () => {
    render(<Spinner />);
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-hidden', 'true');
  });
});
