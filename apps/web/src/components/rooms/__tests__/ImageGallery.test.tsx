import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from '../ImageGallery';

const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg', 'https://example.com/img3.jpg'];

describe('ImageGallery', () => {
  it('renders nothing when images is empty', () => {
    const { container } = render(<ImageGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first image in the hero slot', () => {
    render(<ImageGallery images={images} />);
    const heroImg = screen.getByTestId('gallery-hero').querySelector('img') as HTMLImageElement;
    expect(heroImg).toBeInTheDocument();
    expect(heroImg.src).toBe(images[0]);
  });

  it('shows no thumbnails when only one image', () => {
    render(<ImageGallery images={['https://example.com/img1.jpg']} />);
    expect(screen.queryByTestId('gallery-thumbs')).not.toBeInTheDocument();
  });

  it('shows thumbnails (up to 4) for multiple images', () => {
    render(<ImageGallery images={images} />);
    const thumbButtons = screen.getAllByTestId('gallery-thumb');
    expect(thumbButtons).toHaveLength(Math.min(images.length, 4));
  });

  it('first thumbnail has active state by default', () => {
    render(<ImageGallery images={images} />);
    const thumbs = screen.getAllByTestId('gallery-thumb');
    expect(thumbs[0]).toHaveAttribute('data-active', 'true');
    expect(thumbs[1]).not.toHaveAttribute('data-active');
  });

  it('clicking a thumbnail changes the active image in hero', () => {
    render(<ImageGallery images={images} />);
    const thumbs = screen.getAllByTestId('gallery-thumb');
    fireEvent.click(thumbs[1]);
    const heroImg = screen.getByTestId('gallery-hero').querySelector('img') as HTMLImageElement;
    expect(heroImg.src).toBe(images[1]);
  });

  it('clicking hero opens lightbox', () => {
    render(<ImageGallery images={images} />);
    fireEvent.click(screen.getByTestId('gallery-hero'));
    expect(screen.getByTestId('gallery-lightbox')).toBeInTheDocument();
  });

  it('clicking lightbox overlay closes it', () => {
    render(<ImageGallery images={images} />);
    fireEvent.click(screen.getByTestId('gallery-hero'));
    fireEvent.click(screen.getByTestId('gallery-lightbox'));
    expect(screen.queryByTestId('gallery-lightbox')).not.toBeInTheDocument();
  });

  it('pressing Escape closes the lightbox', () => {
    render(<ImageGallery images={images} />);
    fireEvent.click(screen.getByTestId('gallery-hero'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('gallery-lightbox')).not.toBeInTheDocument();
  });
});
