import { beforeEach, describe, expect, it } from 'vitest'
import { hasSeenTutorial, markTutorialSeen, tutorialStorageKey } from './tutorialSeen'

const memory = new Map<string, string>()
const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
  clear: () => memory.clear(),
}

describe('tutorialSeen', () => {
  beforeEach(() => {
    memory.clear()
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: localStorageStub } })
  })

  it('is unseen until marked for that student', () => {
    expect(hasSeenTutorial('maya@student.ubc.ca')).toBe(false)
    markTutorialSeen('Maya@student.ubc.ca')
    expect(hasSeenTutorial('maya@student.ubc.ca')).toBe(true)
    expect(hasSeenTutorial('leo@student.ubc.ca')).toBe(false)
    expect(localStorageStub.getItem(tutorialStorageKey('maya@student.ubc.ca'))).toBe('1')
  })

  it('treats a missing email as already seen so the tutorial cannot loop', () => {
    expect(hasSeenTutorial('')).toBe(true)
    expect(hasSeenTutorial('   ')).toBe(true)
  })
})
