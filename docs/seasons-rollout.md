# Seasons rollout — production review

Status: **production database migrated on September 8, 2026 at 09:35:12 America/Toronto**. Migration `20260908090000` is recorded in Supabase. Production postflight passed; the user is handling the Vercel application deployment.

## Exact first cutover

Migration: `supabase/migrations/20260908090000_add_seasons.sql`.

- Autumn 2026 starts **September 8, 2026 at 00:00 America/Toronto** (`2026-09-08T04:00:00Z`). Its exclusive end is **December 8, 2026 at 00:00 America/Toronto** (`2026-12-08T05:00:00Z`). The last playing date is December 7. This is three calendar months, including the daylight-saving change, not 90 days.
- The migration first verifies that exactly one existing authenticated account with a profile matches **zeleniak.nikita@gmail.com**, case-insensitively. Its immutable user UUID becomes the sole entry in `app_admins`. If no unique account is found, the entire transaction aborts before any reset.
- Every existing player is copied to `season_standings` for **Summer 2026** with their exact final rating, wins, losses, doubles counters, identity fields, and lifetime counters. Every existing doubles team is copied likewise, including its name, member IDs, and member names. Snapshot rows have no cascading foreign key to players/teams, so later edits/deletions cannot rewrite the saved identities or results.
- Final ranks use rating descending, wins descending, losses ascending, creation time ascending, then UUID ascending. The highest-ranked player and team **with at least one win** become the saved champions. No wins means no champion. The old app had no separate season-winner record; the champion is derived from its final rating table. This adds an explicit deterministic tie-break where the old table sorted only by rating.
- Every existing singles match, doubles match, singles report, doubles report, and tournament is tagged Summer. Nothing is deleted or replayed. Confirmed matches retain their IDs, original scores/score summaries, timestamps, deltas, tournament/invite/report links, winners, losers, and confirmation metadata.
- `season_history` also stores a full JSON copy of each match/report row. This preserves the original history even if existing cascade/set-null relationships later change the live tables. Reports remain visible only to their participants and the administrator; confirmed match history is visible to signed-in players.
- Pending singles and doubles reports become **expired**, with a boundary note. Their submitted scores and other fields remain stored. They are not treated as confirmed results, do not enter final ratings, and cannot be confirmed later. Confirmed/declined reports keep their status.
- Existing player wins/losses and doubles wins/losses are copied into dedicated lifetime columns. Existing team wins/losses are copied into team lifetime columns. This preserves stored totals exactly; it does not attempt to repair or reinterpret older scoring implementations.
- Player `rating`, `wins`, `losses`, `doubles_wins`, and `doubles_losses` reset to **1000, 0, 0, 0, 0**. Team `rating`, `wins`, and `losses` reset to **1000, 0, 0**. Subsequent confirmed results increment seasonal and lifetime totals together. Achievement eligibility uses lifetime win totals; awarded achievement rows and cosmetic unlocks are unchanged.

## Matches already played today

**Every match already recorded when the migration acquires its write locks stays in Summer, including September 8 matches.** Their exact existing Elo effects are included in Summer’s final snapshot. They are not recalculated from 1,000 and do not contribute to Autumn’s new counters.

This is an explicit one-time grandfathering rule. The old schema has recording timestamps, not a trustworthy played-at field, and ratings may have evolved under different historical doubles formulas. Inferring a midnight replay would change saved results or fail to reproduce the current final ratings. The app displays this exception in the Summer archive.

A September 8 game that has **not been submitted** when the cutover happens can be reported into Autumn after rollout. A game already submitted and still awaiting confirmation expires with Summer; it must not be submitted again merely to transfer its rating effect. Games played before September 8 must not be newly submitted into Autumn. Reports carry the season ID from the rendered form, so stale pre-rollover forms fail instead of silently attaching to a different season.

The migration uses a fixed scheduled Autumn start and a separately recorded Summer `closed_at` cutover instant. Thus some grandfathered Summer records legitimately have timestamps after its scheduled September 8 boundary.

## Tournaments and doubles

Team identities and partnerships survive the reset. Team lifetime records, archived team standings, and every doubles score/delta are retained; both team and player seasonal ratings restart at 1,000.

Existing tournaments remain associated with Summer, including unfinished/open tournaments. Old tournament results cannot change Autumn ratings. Their screens identify the original season and disable rated bracket controls. Create a new tournament for Autumn instead of moving an old bracket between seasons. Team partnership invitations are not match results and remain available.

## Administrator controls

Only the designated account sees `/protected/admin`. The page and server actions enforce the database-backed admin check; knowing the URL does not grant access. The account can:

- Rename the active season without moving dates or triggering a reset.
- Review and close a season at or after its scheduled end, then name/start the next three-month season.
- Manage any tournament through the existing tournament screens.
- Moderate posts and comments through the private admin page, with a per-removal acknowledgment.

An ordinary tournament organizer cannot reset the league. There is no client-writable admin flag. Even the admin UI cannot arbitrarily edit ratings or rewrite sealed season snapshots.

## Safe subsequent rollover

`start_next_season(expected_season_id, name)` checks admin access and takes the same transaction advisory lock used by rating writers and report inserts. It snapshots standings/history, expires pending reports, closes the old season, inserts one successor, and resets seasonal counters in one transaction.

A unique successor constraint and the expected-season ID make concurrent clicks and retries return the already-created successor without resetting again. Any failure rolls back the whole operation. Before the scheduled close, rollover is rejected. At/after the boundary, rated reports/confirmations stop until the administrator rolls over. The next season starts at the previous scheduled end, with its end calculated using Toronto calendar months. There is no automatic destructive background rollover. If administration is delayed by an entire next season, the function stops for database-administrator review rather than creating an already-expired season.

## Production application sequence

1. Take a restorable database backup. Run `supabase/checks/seasons-preflight.sql` with a database-owner connection and retain the result counts, today's matches, and pending reports for review. Do not use a public anonymous API key to apply schema migrations.
2. Temporarily pause match reporting while deploying the database and app together. The migration locks protect database consistency, but an old browser/app version cannot use the new season-aware reporting forms.
3. Apply the migration once using the project's normal Supabase migration workflow or the SQL Editor. The migration is transactional. Do not remove its transaction, locks, uniqueness constraints, or organizer-account validation.
4. Deploy the corresponding application code. Players should refresh any previously opened match-report forms. The app expects the new schema and RPCs.
5. Run `supabase/checks/seasons-postflight.sql` immediately before allowing new results. Its reset-to-1,000 checks are intentionally valid only before new matches are confirmed. Verify the sole admin UUID belongs to the requested account; inspect Summer players/doubles/history and Autumn's fresh tables in the app.
6. Keep the backup. If an emergency rollback is needed after new results arrive, preserve/export those results first and restore as a coordinated database/application operation; do not blindly copy Summer ratings over newer results.

Production preflight and postflight completed using the existing database configuration. The archive contains **11 player snapshots, 15 team snapshots, 43 singles matches, 16 doubles matches, 41 singles reports, and 23 doubles reports**. Two pending singles reports expired; there were no pending doubles reports and no confirmed results recorded on September 8 before cutover. All **48 achievements** remained unchanged. Reset, lifetime-total, and exact-match-history checks returned zero discrepancies.

A full PostgreSQL custom-format backup was saved at `.local-backups/before-seasons-20260908-093247.dump` and fully decoded successfully with `pg_restore` before migration. It is excluded from Git. Production verification output and the migration log are in the same private directory. Local tests and browser previews used synthetic data; production data was only accessed for the requested backup, migration, and verification.

## Verification performed

- Real PostgreSQL 14 fixture migration from the existing June match/rating migrations; minimal unrelated auth/community scaffolding is used for local tests.
- Exact archived player/team stats, match JSON (including September 8 examples), champions, lifetime counters, and achievement preservation.
- New-season singles/doubles Elo updates, cumulative totals, late report rejection, stale season IDs, ordinary-user/admin privileges, protected rating columns, and immutable archives.
- Second rollover, idempotent retries, name-conflict rollback, and archived player identity stability.
- Independent database connections: simultaneous confirmations, confirmation racing a season boundary, and simultaneous rollovers.
- TypeScript, ESLint, 21 Node tests, and a Next.js production build.
- Browser review with synthetic API data: current/archive switching, Summer singles/doubles scores, admin review controls, direct non-admin route denial, light/dark styling, and mobile layout. These UI fixtures are not production data.

Local reproduction (fresh disposable database only):

```sh
psql "$TEST_DATABASE_URL" -f tests/sql/run-seasons.sql
psql "$TEST_DATABASE_URL" -f tests/sql/concurrency-seasons.sql
psql "$TEST_DATABASE_URL" -f tests/sql/admin-seasons.sql
npm test
npm run lint
npm run build
```

The concurrency suite opens two loopback connections using the current database and PostgreSQL port; it assumes local trusted test authentication and the `dblink` extension. Never run the fixture scripts against production.
