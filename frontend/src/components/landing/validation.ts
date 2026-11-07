const emailPattern = /^[^\s@]+@[^\s@]+$/
// Aligned with backend/app/schemas.py at 14a7d7a, using parsed-domain
// matching to avoid accepting crafted hosts such as you@fakeubc.ca.
const acceptedUbcDomains = new Set(['student.ubc.ca', 'alum.ubc.ca', 'students.cs.ubc.ca', 'ubc.ca'])

export function getUniversityEmailError(value: string): string {
  const email = value.trim().toLowerCase()
  if (!email) return 'Enter your university email to continue.'
  if (!emailPattern.test(email)) return 'Enter a valid email, like you@student.ubc.ca.'
  if (!acceptedUbcDomains.has(email.split('@')[1])) return 'Use your UBC email, such as you@student.ubc.ca.'
  return ''
}
