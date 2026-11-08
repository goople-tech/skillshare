# Dashboard workspace

## Product intent
`/home` is a task-oriented workspace, not a marketing page. Requests and next actions take priority. Use the shared blue/ivory palette; keep body copy and controls readable (normally 14–18px). Use conversational copy and one clear example note rather than repeated explanatory paragraphs; don't reintroduce tiny repeated captions or fake match scores. Preserve the two-column desktop layout and the attention-first mobile order.

## Data-source boundary (future backend)

- Presentational cards consume **dashboard view models in `types.ts` only**. They never fetch, know API URLs, or receive raw Auth0/FastAPI records.
- `dataSource.ts` is the required I/O contract: snapshot read plus request, profile, recommendation, notification and offer mutations. `useWorkspaceData.tsx` owns loading/errors, snapshot updates, per-key duplicate protection and re-render synchronization. `home.tsx` provides its instance and stable identity mapping; don't create nested providers.
- `previewDataSource.ts` is an explicitly in-memory demo source. Fixtures never describe real students, working messages, bookings or live campus activity. Do not make preview confirmations sound like successful network operations.
- `apiDataSource.ts` provides an initial connector for existing `/me` and `/skillshare/matches` resources, with mapping at the boundary. `useApiClient.ts` transports Auth0 bearer tokens through `api.js`. Switch from `PreviewWorkspaceDataSource` by supplying `source={apiSource}` to `WorkspaceProvider`, not by inserting fetch calls in cards.
- Unimplemented API operations reject with a direct explanation. Add a real backend contract before changing connector method signatures or pretending these writes work. Actual recommendations have no live notifications/sessions/requests yet; expose empty or pending states honestly.
- Account verification is not student-role verification. Keep `verified` false/omitted until a server supplies a distinct eligibility proof; do not infer it from Auth0, a UBC-domain email, an `/account` route or profile presence. Retrieval of other students needs a deliberately limited public profile, not unrestricted private `UserOut` data.
- API field normalization (`profileFromApi`, `personFromApi`, `skillMatchesFromApi`) is the one translation point. Do not shift client field names into backend payloads without confirming server changes. Keep errors readable and non-sensitive, preserve previous data on a failed write, and only show success after server acknowledgement.

## Layout and interaction contracts

- The dashboard uses native modal dialogs. Center modals with `inset: 0; margin: auto;` and bounded viewport dimensions, including notifications/search, request details, recommendations and offer creation. Menus remain actual anchored dropdowns.
- Profile forms and offer forms are async: guard duplicate submissions, show local busy/errors and never silently drop failed backend mutations.
- Base UI dropdowns use explicit non-modal behavior. Preserve Escape/outside dismissal and focus restoration. Cancel native dialogs through cleanup, not duplicate state-driven event callbacks.
- Preserve keyboard search, reduced-motion scrolling, semantic regions, visible focus, and accessible notification names that update with read count. Require no horizontal overflow at 390px.
- Header utility controls are independent shrink-sized siblings rather than absolutely positioned controls; when the visible search includes its keyboard hint, its reserved width plus the bell gap must prevent collision. Profile triggers must explicitly be single-row inline flex with equal fixed avatar width/height and a non-shrinking caret; Base UI menus alone don't normalize a plain button's content box.
- SkillShare exchange headlines wrap as one center-aligned `offer ↔ request` unit. Don't detach either skill or the arrow onto unsemantic independent lines for narrow layouts. Verify these with element geometry, not only snapshots, at 1440, 1260, 1210 and mobile widths.

## Location sharing

- `LiveHeatmap` uses existing FastAPI `/presence/me`, `/presence` and `/presence/heatmap`. `/presence/me` is authoritative on every refresh/reload; never clear presence merely for route unmount/pagehide or write a duplicate persisting client cache. The backend TTL is the only release mechanism besides explicit stop. The shared heat layer consumes only coarse `areas` and `active_students`; exact coordinates are solely the current user's own marker, never markers of other students.
- Show active sharing only after a server-acknowledged POST. Denied geolocation, failed POST and failed DELETE must show an actionable service/permission failure while preserving known last-confirmed state. Do not silently swallow those errors or report success before server confirmation.
- `client-runtime.tsx` obtains the public API URL from `/api/client-config` before rendering authenticated children. `configureApiUrl` overrides Vite's **development-only** `.env` fallback, including `localhost:8010`, which must never be baked into a deployed browser bundle. Presence itself uses the same-origin `/api/campus` proxy. Runtime configuration must be installed before enabling child queries; no client-config response may include credentials.
- Local development keeps its explicit Vite/localhost fallback. A deployed backend still needs a reachable HTTPS URL plus production CORS; ask the backend owner to persist proper PostgreSQL data and CORS origin `https://skillshare.app.space`. Do not use DeepSpace shared presence as secondary coordinate storage.
- Lifecycle unit/backend and browser tests in `tests/location-sharing.spec.ts` exercise rejected POST, valid POST, reload restore and explicit stop/delete.

## Verification
Run typecheck/lint/build/unit tests, the scoped Playwright dashboard specs, and real runtime smoke/API checks. Centering and 390px/no-overflow must keep passing after CSS changes.
