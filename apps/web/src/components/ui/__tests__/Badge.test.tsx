import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Confirmed</Badge>);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it.each(['success', 'warning', 'cancelled', 'neutral'] as const)(
    'applies %s variant class',
    (variant) => {
      render(<Badge variant={variant}>label</Badge>);
      expect(screen.getByText('label')).toHaveClass(`badge--${variant}`);
    },
  );
});
