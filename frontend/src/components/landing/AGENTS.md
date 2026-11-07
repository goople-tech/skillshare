# Landing frontend guidance

## Scope

Owns the public UBC Ver. landing page UI shared by `src/pages/index.tsx`. `src/landing.css` holds the visual system and responsive layout; the page is composed from the components in this directory. `src/main.tsx` imports this stylesheet and therefore still loads Tailwind, the DeepSpace theme tokens, and `src/styles.css` utilities.

Refer to https://docs.deep.space/get-started/project-structure.md before moving routes or changing providers. Keep the public landing renderable during prerendering: do not read browser-only APIs during render. DeepSpace providers are intentionally not mounted on the landing page.

## Design conventions

- Use only the project palette: `#F8F5EE` ivory, `#FFFDF8` cream, `#173B5E` deep blue, `#5A859A` ocean, `#B96745` orange, `#E9D6B8` sand, `#24333D` ink, and `#D8DFDF` borders. Tints used for secondary surfaces should derive subtly from these colors.
- Lora is used for editorial headings; DM Sans for readable interface text. Maintain generous space, restrained orange accents, subtle borders, and light shadows.
- Prefer semantic markup, explicit labels, useful alt text, visible focus, and keyboard-operable controls. The map requires a text description and an illustrative-data disclaimer; do not rely on hotspot color alone.
- Keep mobile behavior at 680px and below, with additional tablet breakpoints at 900px and 1100px. Check narrow and wide layouts after changing shared CSS.
- Animations are progressive decoration and must respect `prefers-reduced-motion`.

## UI state and boundaries

`SignupDialog.tsx` uses a native `<dialog>` for built-in focus containment, Escape dismissal, and scroll-safe modality. Keep `open` and `onClose` state in the page; never leave hidden dialogs mounted visibly. Reset transient validation state on open.

The email form is an explicitly labeled frontend prototype only. It neither sends email nor verifies accounts. `validation.ts` checks format/domain expectations only, using a true parsed-domain (not suffix) allowlist currently aligned to the backend input domains; domain possession and student status must be verified by a properly authorized backend before linking this UI to privileged data. Keep this distinction visible in the UI and documentation.

## Verification

Run `npm run test:frontend` for pure validation tests and `npm run lint` for the full repository. Add pure tests for validation helpers here rather than bypassing SDK registration checks in `vitest.config.ts`. Manually verify dialog errors, valid-address prototype confirmation, Escape/close, focus visibility, and the mobile menu after changes.

Keep external image sources appropriate for the project and compress local assets. Replace the illustrative student photo with team-approved imagery before calling it authentic UBC photography.

## Visual restraint

Do not add decorative captions, duplicated benefits, or ornamental numbered cards for visual texture. The three onboarding steps retain clear numbering because it aids sequence comprehension. Other feature cards do not need decorative 01/02 labels. Paired feature-card calls to action must share a baseline across desktop, tablet, and mobile: previews use an intrinsic minimum space and controls follow at the card bottom. Prefer concise product explanations and functional interface previews over marketing microcopy.

## Campus identity refinement

Use `CampusMark` as the shared original UBC Ver. arch/open-door motif; it is not the university crest. Pair deep-blue regions with ocean/cream interface elements and restrained sand accents to make the campus identity intentional without mimicking official UBC branding. The original arch, shared horizon, and stream gestures recur at the wordmark, photo seal, and closing CTA, with no extra taglines or decorative statistics.

Preserve one shared container grid, matching paired-card heights, equal onboarding-step columns, and equal horizontal/vertical padding. Do not resize a subcomponent to correct alignment:
fix the parent layout contract. Keep eyebrow/subtext concise; labels in section eyebrows use sentence case. Never present UBC motif art as official UBC identity.

Run `npm run test:layout` with the static preview on port 5174 for repeatable desktop/tablet/mobile preview-boundary checks. `playwright.local.config.ts` uses installed Brave when available or Playwright Chromium otherwise; it is deliberately separate from the registered DeepSpace test suite.

## Opening viewport

The public home first view is one full viewport including the normal header: `.hero` uses `min-height: calc(100svh - 86px)` on desktop/tablet and `calc(100svh - 72px)` on mobile, with `100dvh` enhancement. Do not return to `100vh + header`, which lets the following section bleed into view. Content sizing and vertically centered composition may grow the hero for short screens or larger text; never crop the main content to preserve the fold. The local layout suite freezes decorative `.reveal` transitions when measuring stable positions and asserts hero/fold boundaries and feature geometry.
