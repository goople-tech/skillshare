export function browserMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Location sharing could not be updated. Try again.'
}
