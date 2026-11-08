# Authentication integration boundary

## Ownership

Auth0 integration is owned by a separate teammate and was added upstream in `5e85cf4`. Do not add a second public-facing auth flow, client secrets, or a false university-email verification claim from the landing page. The client-only `src/pages/auth.tsx` (login/callback), `src/pages/account.tsx` and `src/components/AuthShell.tsx` use `@auth0/auth0-react` (the old `src/main.jsx` entry was removed; `src/App.jsx` is the signed-in app rendered at `/account`); the backend verifies tokens and UBC email eligibility. These are separate from the static page runtime.

## Current boundary

- `src/pages/index.tsx` only composes public landing content and opens a local
  `SignupDialog`. It does not import `deepspace`, Better Auth, Auth0, or a
  session/data hook.
- `SignupDialog.tsx` is explicitly a prototype. It validates allowed UBC-domain
  input formats locally and states that no email is sent and no account is
  created. Its `Preview next step` button must never silently become a
  verified-account success state.
- The public `Log In` entry currently opens the same transparent prototype.
  Replace that handler with a real `/login` or Auth0-backed flow only when its
  owner supplies a documented identity and redirect contract.
- DeepSpace generated auth/record providers remain under
  `src/pages/(app)/_layout.tsx` and are not executed by the static landing page.
  This is where Auth0 integration can replace scaffolded identity without
  changing public presentation, provider-gated routes, or component contracts.

## Migration plan

1. Review the existing Auth0 config. Owner confirms tenant/OIDC application configuration, allowed callback
   and logout origins, callback/logout/denial routes, and an env contract.
2. Integrate the existing Auth0 sign-in/session behavior within the app/backend boundary, preserving token subject, issuer, audience, scopes, and role/eligibility enforcement on the server. A UBC email-domain input or a client-side session is not student
   verification.
3. Adapt the landing entry points to the actual Auth0 passwordless/login flow only after that end-to-end contract works. Preserve the accessible dialog until verified registration and backend domain/privilege checks work. A successful domain preview alone cannot issue a verified session.
4. Retire the temporary `better-auth@1.7.18` override when no remaining
   DeepSpace runtime dependency needs it. Remove it only with updated lockfile
   and full compatibility/API tests. No redundant frontend `useAuth`
   requirements should be introduced into the public page.
5. Complete registered DeepSpace/local integration testing for any parts of
   the runtime that remain, then separately authorize deployment. Landing
   unit/layout/build checks do not constitute live identity verification.

Credentials stay in ignored environment files or a managed secret store. Never
paste Auth0/Google/GitHub provider secrets into code, Git, screenshots, or chat.
