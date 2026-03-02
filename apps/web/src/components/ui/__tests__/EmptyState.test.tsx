import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<EmptyState title="No results" subtitle="Try different filters" />);
    expect(screen.getByText('Try different filters')).toBeInTheDocument();
  });

  it('renders without subtitle', () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
