# Client routes

- `/auth` is outside the `(app)` group because it needs only public runtime configuration and Auth0, not the DeepSpace authenticated workspace.
- Any standalone route using `AuthShell` or `useClientRuntime` must explicitly wrap that route in `ClientRuntimeProvider`. The `(app)/_layout.tsx` provider is not an ancestor of top-level `/auth`.
- Do not duplicate global providers or move auth providers into the static landing route. Landing calls `/auth`; authenticated dashboard routes retain their existing provider contracts.
- Cover standalone auth-route provider wiring with a browser test using test-only public configuration and identity mocks, never real credentials.
