# Dashboard workspace

## Product intent
- `/home` is a task-oriented student workspace, not a second landing page. Attention items (requests), next sessions, and lightweight discovery come before secondary previews.
- Use the existing DM Sans/Lora typography and the approved UBC Ver. palette. Keep panels compact, borders subtle, and controls keyboard accessible. Do not introduce gradients, match scores, dating mechanics, or fictional usage/verification metrics.

## Data and authentication boundaries
- `useWorkspaceData.tsx` owns a clearly labelled, in-memory UI-preview adapter. `sampleData.ts` contains UI fixtures—not live students, notifications, session bookings, matching results, activity analytics, or API results.
- Preview mutations change local UI state only. Never let their labels imply network delivery, scheduling, persistent requests, or saved server profiles. Duplicate per-entity actions are guarded by stable keys in `busyActions`.
- Replace the adapter as a unit when a backend contract is available; map loading/error/empty states explicitly and preserve optimistic-action rollback where mutations can fail. Do not add credentials or break frontend boundaries to make preview actions look live.
- Do not implement or bypass authentication here. The team-owned Auth0 integration will replace the temporary gate/navigation identity. Tests use DeepSpace server-issued test identities only, never real university sign-ins.
- `verified` must only come from explicit server-side proof. Never infer student verification from an email address, name, route guard, Auth0 token presence, or account role. If that API is unavailable, omit the verified badge rather than passing `false` and claiming a check happened.
- Do not expose personal contact information, exact location, or full schedules. `CampusPreview.tsx` is an illustrative broad-area map only.

## Layout and interactions
- `home.tsx` owns one outer workspace provider and the temporary app header. `DashboardView.tsx` consumes that provider—never add a second nested provider.
- Navigation destinations must target working sections or defined routes. Respect reduced motion for section scrolling. Return to `/home` through the enhanced `Wordmark` `href` prop.
- Shared Base UI dropdowns use explicit non-modal behavior (`Menu.Root modal={false}`) so surrounding dashboard controls remain operable. Use tests for Escape/outside dismissal and pointer reachability rather than forced clicks.
- Native modal dialogs must close and invoke React cleanup on both pointer/X dismissal and Escape. Tests should verify zero dialogs after cancellation.
- The profile editor remains local until the shared profile endpoint is wired. The external menu opens the preview profile editor via provider UI state, without mutating the workspace preview mode.
- Tablet uses two columns; mobile switches to one with requests/upcoming/discovery first. Preserve no horizontal overflow around 390px and test the exact unread-count button accessible name as notification state changes.

## Verification
From `frontend/`, run `npm run type-check`, `npm run lint`, `npm run build`, and the authenticated browser coverage:
`./node_modules/.bin/deepspace test run tests/dashboard-views.spec.ts`.
Include the smoke/API suite before merging. Screenshots at desktop and mobile and keyboard-dismissal checks are expected for substantial UI changes. Do not deploy from this directory without explicit authorization.
