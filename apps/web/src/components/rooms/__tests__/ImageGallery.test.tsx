import { render, fireEvent } from '@testing-library/react';
import { ImageGallery } from '../ImageGallery';

const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg', 'https://example.com/img3.jpg'];

describe('ImageGallery', () => {
  it('renders nothing when images is empty', () => {
    const { container } = render(<ImageGallery images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first image in the hero slot', () => {
    render(<ImageGallery images={images} />);
    const heroImg = document.querySelector('.image-gallery__hero img') as HTMLImageElement;
    expect(heroImg).toBeInTheDocument();
    expect(heroImg.src).toBe(images[0]);
  });

  it('shows no thumbnails when only one image', () => {
    const { container } = render(<ImageGallery images={['https://example.com/img1.jpg']} />);
    expect(container.querySelector('.image-gallery__thumbs')).not.toBeInTheDocument();
  });

  it('shows thumbnails (up to 4) for multiple images', () => {
    render(<ImageGallery images={images} />);
    const thumbButtons = document.querySelectorAll('.image-gallery__thumb');
    expect(thumbButtons).toHaveLength(Math.min(images.length, 4));
  });

  it('first thumbnail has active class by default', () => {
    render(<ImageGallery images={images} />);
    const thumbs = document.querySelectorAll('.image-gallery__thumb');
    expect(thumbs[0]).toHaveClass('image-gallery__thumb--active');
    expect(thumbs[1]).not.toHaveClass('image-gallery__thumb--active');
  });

  it('clicking a thumbnail changes the active image in hero', () => {
    render(<ImageGallery images={images} />);
    const thumbs = document.querySelectorAll<HTMLButtonElement>('.image-gallery__thumb');
    fireEvent.click(thumbs[1]);
    const heroImg = document.querySelector('.image-gallery__hero img') as HTMLImageElement;
    expect(heroImg.src).toBe(images[1]);
  });

  it('clicking hero opens lightbox', () => {
    const { container } = render(<ImageGallery images={images} />);
    fireEvent.click(container.querySelector('.image-gallery__hero')!);
    expect(container.querySelector('.lightbox')).toBeInTheDocument();
  });

  it('clicking lightbox overlay closes it', () => {
    const { container } = render(<ImageGallery images={images} />);
    fireEvent.click(container.querySelector('.image-gallery__hero')!);
    fireEvent.click(container.querySelector('.lightbox')!);
    expect(container.querySelector('.lightbox')).not.toBeInTheDocument();
  });

  it('pressing Escape closes the lightbox', () => {
    const { container } = render(<ImageGallery images={images} />);
    fireEvent.click(container.querySelector('.image-gallery__hero')!);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.lightbox')).not.toBeInTheDocument();
  });
});
