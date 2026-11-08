/** Types for stickers.js (public profile stickers; ids match the backend allowlist). */
export type Sticker = { id: string; label: string; src: string }
export const STICKERS: Sticker[]
export function stickerSrc(id: string | null | undefined): string
