import { describe, expect, it } from 'vitest'
import { QUIRKS, pickQuirk } from './CrossedCards'

describe('speed matching prompts', () => {
  it('draws from a pool per deck', () => {
    expect(QUIRKS.buddy.length).toBeGreaterThanOrEqual(5)
    expect(QUIRKS.skill.length).toBeGreaterThanOrEqual(5)
    expect(QUIRKS.buddy).toContain(pickQuirk('buddy'))
    expect(QUIRKS.skill).toContain(pickQuirk('skill'))
  })
  it('never repeats the previous prompt back to back', () => {
    for (const kind of ['buddy', 'skill'] as const) {
      for (const previous of QUIRKS[kind]) {
        for (const r of [0, 0.5, 0.999]) expect(pickQuirk(kind, previous, () => r)).not.toBe(previous)
      }
    }
  })
})
