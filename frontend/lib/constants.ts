export const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_BASE || '/image';

export function getImageUrl(filename: string | null | undefined): string {
  if (!filename) return '/sysimage/no-image.png';
  if (filename.startsWith('http')) return filename;
  return `${IMAGE_BASE}/${filename}`;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export const SORT_OPTIONS = [
  { value: 'popularity', label: '인기순' },
  { value: 'newest', label: '신상품순' },
  { value: 'price_asc', label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
  { value: 'name', label: '상품명순' },
];

export const PAGE_SIZES = [24, 40, 80, 120];
