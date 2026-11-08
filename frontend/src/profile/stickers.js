/** Public profile stickers. Ids match the backend allowlist. */
export const STICKERS = [
  { id: 'bird', label: 'Cloud bird', src: '/stickers/bird.png' },
  { id: 'stars', label: 'Stars', src: '/stickers/stars.png' },
  { id: 'sun', label: 'Sun', src: '/stickers/sun.png' },
  { id: 'cloud', label: 'Cloud', src: '/stickers/cloud.png' },
  { id: 'warm-cloud', label: 'Warm cloud', src: '/stickers/warm-cloud.png' },
]

export function stickerSrc(id) {
  return STICKERS.find((sticker) => sticker.id === id)?.src || ''
}
