# Meet people: swipe decks, filters, matches and messages

- `SwipeLauncher` renders the "Meet people" section (`#meet`) in `DashboardView`: Speed Matching (`CrossedCards`) beside `MatchBrowser` (six filter chips + match tiles), mutual matches with a message button, the full-screen deck (`SwipeDeck`) and `ChatDialog`.
- The nav's Buddies / SkillShare tabs scroll to `#meet` and set `#buddies` / `#skillshare`; that hash selects which phone is in front (Buddies by default). The prompt shows a light-hearted quirk for the selected deck plus "Select ←/→".
- Speed Matching keys: the selected deck's arrow (or its card) opens the deck; the other arrow (or card) switches decks. Keys act only while the section is ≥45% visible or fills ≥40% of the screen (zoomed-in pages) and no dialog is open. In a deck, the first ←/→ tilts the top card (PASS/LIKE), the same key again commits, the opposite key switches, ↓/Backspace or Esc cancels (Esc again closes). Cards can also be dragged or flicked.
- `filters.ts` holds the filter definitions (AND-combined, keeping the server's compatibility order) built only from server fields and reasons. Tests: `filters.test.ts`.
- Data goes through `swipeSource.ts` only (`/swipe/{buddy|skill}/deck`, `POST /swipe`, `/swipe/matches`, `/messages/{user_id}`). `cardFromApi` / `messageFromApi` are the mapping points. Components never fetch.
- Ordering is compatibility only. No popularity/Elo rating and no numeric score is sent or shown. Other students' stored photos are not shared (cards show initials).
- Deck swipes are optimistic with rollback; tile swipes and messages appear only after server acknowledgement. Matches are shown only when the server reports `matched: true`.
- Messages: only mutual matches can message; the dialog polls every 4s while the tab is visible (no realtime push yet).
- `PreviewSwipeSource` is a labelled, in-memory sample deck offered only when the service can't be reached. It never reports matches, saves nothing and has no messaging.
- Respect `prefers-reduced-motion`; keep 390px with no horizontal overflow. Unit tests: `swipeSource.test.ts`, `filters.test.ts`.
