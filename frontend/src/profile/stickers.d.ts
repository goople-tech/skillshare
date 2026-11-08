export type ProfileSticker = {
  id: 'bird' | 'stars' | 'sun' | 'cloud' | 'warm-cloud'
  label: string
  src: string
}

export const STICKERS: ProfileSticker[]
export function stickerSrc(id: string | undefined | null): string
