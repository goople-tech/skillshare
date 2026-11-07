import { describe, expect, it } from 'vitest'
import { getUniversityEmailError } from './validation'

describe('university email preview validation', () => {
  it.each([
    'you@student.ubc.ca',
    ' first.last@student.ubc.ca ',
    'graduate@alum.ubc.ca',
    'student@students.cs.ubc.ca',
    'person@ubc.ca',
  ])('accepts a permitted UBC domain %s', (email) => {
    expect(getUniversityEmailError(email)).toBe('')
  })

  it.each(['', 'hello', 'you@gmail.com', 'you@alumni.ubc.ca', 'you@fakeubc.ca', 'you@student.ubc.ca.example.com'])('rejects invalid or unexpected domains: %s', (email) => {
    expect(getUniversityEmailError(email)).not.toBe('')
  })
})
