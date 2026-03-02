import { render, screen } from '@testing-library/react';
import { AmenitiesGrid } from '../AmenitiesGrid';

describe('AmenitiesGrid', () => {
  it('renders nothing when features is empty', () => {
    const { container } = render(<AmenitiesGrid features={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders mapped label for known feature "projector"', () => {
    render(<AmenitiesGrid features={['projector']} />);
    expect(screen.getByText('Projector')).toBeInTheDocument();
  });

  it('renders mapped label for known feature "whiteboard"', () => {
    render(<AmenitiesGrid features={['whiteboard']} />);
    expect(screen.getByText('Whiteboard')).toBeInTheDocument();
  });

  it('renders mapped label for known feature "video_conf"', () => {
    render(<AmenitiesGrid features={['video_conf']} />);
    expect(screen.getByText('Video Conferencing')).toBeInTheDocument();
  });

  it('renders raw feature name as label for unknown feature', () => {
    render(<AmenitiesGrid features={['custom_feature']} />);
    expect(screen.getByText('custom_feature')).toBeInTheDocument();
  });

  it('renders all provided features', () => {
    render(<AmenitiesGrid features={['projector', 'whiteboard', 'ac']} />);
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('Whiteboard')).toBeInTheDocument();
    expect(screen.getByText('Air Conditioning')).toBeInTheDocument();
  });
});
