import { test as base, expect } from '@playwright/test'

// Complete public configuration and test identity only. No real Auth0 credentials are used.
export const test = base.extend({
  context: async ({ context }, provideContext) => {
    await context.route('**/api/client-config', route => route.fulfill({ json: { apiUrl: `http://localhost:${process.env.DEEPSPACE_PORT ?? 5175}`, auth0Domain: 'preview.invalid', auth0ClientId: 'preview' } }))
    await provideContext(context)
  },
})
export { expect }
