import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilters } from '../SearchFilters';
import type { SearchParams } from '../../../types';

const defaultParams: SearchParams = {
  start: '2030-06-01T10:00:00.000Z',
  end: '2030-06-02T10:00:00.000Z',
  capacity: 2,
  featuresText: '',
  page: 1,
};

describe('SearchFilters', () => {
  it('renders all filter inputs and search button', () => {
    render(
      <SearchFilters
        params={defaultParams}
        loading={false}
        onParamChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('Check-in')).toBeInTheDocument();
    expect(screen.getByText('Check-out')).toBeInTheDocument();
    expect(screen.getByText('Min. capacity')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search rooms/i })).toBeInTheDocument();
  });

  it('calls onParamChange with capacity as Number when changed', () => {
    const onParamChange = vi.fn();
    render(
      <SearchFilters
        params={defaultParams}
        loading={false}
        onParamChange={onParamChange}
        onSearch={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '8' } });
    expect(onParamChange).toHaveBeenCalledWith('capacity', 8);
  });

  it('calls onParamChange with featuresText when an amenity pill is toggled', () => {
    const onParamChange = vi.fn();
    render(
      <SearchFilters
        params={defaultParams}
        loading={false}
        onParamChange={onParamChange}
        onSearch={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /projector/i }));
    expect(onParamChange).toHaveBeenCalledWith('featuresText', 'projector');
  });

  it('calls onSearch when Search button is clicked', () => {
    const onSearch = vi.fn();
    render(
      <SearchFilters
        params={defaultParams}
        loading={false}
        onParamChange={vi.fn()}
        onSearch={onSearch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /search rooms/i }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('Search button is disabled and shows loading when loading=true', () => {
    render(
      <SearchFilters
        params={defaultParams}
        loading={true}
        onParamChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /search rooms/i })).toBeDisabled();
  });
});
