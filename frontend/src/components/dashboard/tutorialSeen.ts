const PREFIX = 'flockwork.tutorial-seen:'

export function tutorialStorageKey(email: string) {
  return `${PREFIX}${email.trim().toLowerCase()}`
}

/** Missing or unreadable storage counts as seen so the card cannot loop forever. */
export function hasSeenTutorial(email: string) {
  if (!email.trim()) return true
  try {
    return window.localStorage.getItem(tutorialStorageKey(email)) === '1'
  } catch {
    return true
  }
}

export function markTutorialSeen(email: string) {
  if (!email.trim()) return
  try {
    window.localStorage.setItem(tutorialStorageKey(email), '1')
  } catch {
    // Private mode can block storage; the next visit then stays tutorial-free via hasSeenTutorial.
  }
}
