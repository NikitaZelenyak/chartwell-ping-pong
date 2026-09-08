# Arcade redesign review — September 8, 2026

## Delivered

- Charcoal/cyan dark theme and pale/cyan light theme, with lime scoreboard accents and an orange rally ball. System theme remains the default.
- Illustrated landing court, personal dashboard scoreboard, season champion treatment, consistent page headers, cards, controls, and authentication shell.
- Shared SVG two-paddle rally in page, section, and inline loading states. Standings, player cards, and posts use static structural skeletons.
- Pending labels reserve their layout space; compact rally indicators replace generic spinners. Buttons remain disabled and expose busy state while submitting.
- Navigation indication starts after 150 ms, only for navigation accepted by Next.js or a season change. Completion, error boundaries, rejected requests, Escape, history changes, and teardown clear it. A 10-second watchdog clears abandoned indication without claiming success or delaying content.
- Appearance includes a persistent animation preference. Device reduced motion takes precedence. Decorative rallies pause offscreen and all animations pause in hidden tabs. Reduced motion keeps court artwork static and suppresses celebration particles.
- Mobile navigation uses a portal, traps keyboard focus, supports Escape, and restores focus. Invites now has a navigation entry.
- Reaction celebrations now run only after a successful response. Confirmed organizer feedback has a brief entrance; standings and reading surfaces stay still.

## Verification

- TypeScript, ESLint, 25 Node tests, and production build pass.
- Four new tests cover motion preferences, same-page/external/season navigation classification, the 150 ms delay, cancellation/replacement cleanup, and abandoned navigation cleanup.
- Synthetic local Supabase fixtures were used; no production records were changed.
- Responsive DOM sizing sweep: 13 league/landing page variants at 390, 768, and 1440 px in both themes (78 checks), plus four authentication forms at those sizes/themes (24 checks).
- The sweep found a mobile guide overflow caused by the formula's intrinsic width. Cards now allow shrinking; the formula scrolls inside its card. Mobile recheck passed.
- Screenshots reviewed for landing, dashboard, seasons, doubles, posts, invitations, profiles, player detail, tournament detail, Admin, and authentication. Light surfaces and dark surfaces retain readable labels and clear score hierarchy.
- Season selector switched from Autumn to archived Summer; the heading, champion, standings, original scores, and match history updated and navigation indication cleared.
- Animation-off persisted after reload. Keyboard Shift+Tab wrapped inside the drawer and Escape returned focus to the opener.
- A deliberately delayed synthetic Admin save kept the button at 154.35 px before/during submission, showed disabled/busy feedback, and displayed success only after the response.
- Both empty lists and populated post/player/open-tournament detail pages were reviewed. A live tournament bracket and real backend writes were not exercised. Device reduced-motion resolution is covered by unit checks and CSS; browser visual testing used the app's animation toggle.

## Deployment

No database migration, dependency installation, or season/rating/permission changes are part of this redesign. Deploy the code through the existing Vercel workflow.
