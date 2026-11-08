import { beforeEach, describe, expect, it } from 'vitest'
import { configureApiUrl, readApiUrl } from './apiConfig'

describe('public runtime API configuration', () => {
  beforeEach(() => configureApiUrl(undefined))

  it('uses the provided hosted backend without a localhost development fallback', () => {
    configureApiUrl('https://66-42-69-42.sslip.io/')
    expect(readApiUrl()).toBe('https://66-42-69-42.sslip.io')
  })

  it('rejects an empty production configuration instead of using localhost', () => {
    configureApiUrl(null)
    expect(readApiUrl()).toBeNull()
  })
})
