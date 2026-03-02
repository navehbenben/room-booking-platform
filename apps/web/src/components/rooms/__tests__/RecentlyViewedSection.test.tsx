import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: vi.fn(),
}));

import { RecentlyViewedSection } from '../RecentlyViewedSection';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';

const makeRoom = (id: string, features: string[] = []) => ({
  roomId: id,
  name: `Room ${id}`,
  capacity: 4,
  features,
});

describe('RecentlyViewedSection', () => {
  it('renders nothing when rooms is empty', () => {
    vi.mocked(useRecentlyViewed).mockReturnValue({ rooms: [], addRoom: vi.fn(), clearAll: vi.fn() });
    const { container } = render(<RecentlyViewedSection onView={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders room cards when rooms exist', () => {
    vi.mocked(useRecentlyViewed).mockReturnValue({
      rooms: [makeRoom('r1'), makeRoom('r2')],
      addRoom: vi.fn(),
      clearAll: vi.fn(),
    });
    render(<RecentlyViewedSection onView={vi.fn()} />);
    expect(screen.getByText('Room r1')).toBeInTheDocument();
    expect(screen.getByText('Room r2')).toBeInTheDocument();
  });

  it('Clear button calls clearAll', () => {
    const clearAll = vi.fn();
    vi.mocked(useRecentlyViewed).mockReturnValue({
      rooms: [makeRoom('r1')],
      addRoom: vi.fn(),
      clearAll,
    });
    render(<RecentlyViewedSection onView={vi.fn()} />);
    fireEvent.click(screen.getByText('Clear all'));
    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it('View button calls onView with roomId', () => {
    const onView = vi.fn();
    vi.mocked(useRecentlyViewed).mockReturnValue({
      rooms: [makeRoom('room-99')],
      addRoom: vi.fn(),
      clearAll: vi.fn(),
    });
    render(<RecentlyViewedSection onView={onView} />);
    // Each card is a <button aria-label="View {name}">
    fireEvent.click(screen.getByRole('button', { name: 'View Room room-99' }));
    expect(onView).toHaveBeenCalledWith('room-99');
  });

  it('shows up to 2 feature badges per room', () => {
    vi.mocked(useRecentlyViewed).mockReturnValue({
      rooms: [makeRoom('r1', ['wifi', 'projector', 'tv'])],
      addRoom: vi.fn(),
      clearAll: vi.fn(),
    });
    render(<RecentlyViewedSection onView={vi.fn()} />);
    // 'wifi' has no FEATURE_LABEL entry → shown as-is
    expect(screen.getByText('wifi')).toBeInTheDocument();
    // 'projector' → FEATURE_LABELS['projector'] = 'Projector'
    expect(screen.getByText('Projector')).toBeInTheDocument();
    // 'tv' → FEATURE_LABELS['tv'] = 'TV Screen' — neither matches bare 'tv'
    expect(screen.queryByText('tv')).not.toBeInTheDocument();
  });

  it('shows "+N more" when features exceed 2', () => {
    vi.mocked(useRecentlyViewed).mockReturnValue({
      rooms: [makeRoom('r1', ['wifi', 'projector', 'tv', 'ac'])],
      addRoom: vi.fn(),
      clearAll: vi.fn(),
    });
    render(<RecentlyViewedSection onView={vi.fn()} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
