\set ON_ERROR_STOP on
\ir setup.sql
\ir ../../supabase/migrations/20260625210000_chartwell_pinpong_initial.sql
\ir ../../supabase/migrations/20260625214500_add_avatars_remove_profile_extras.sql
\ir ../../supabase/migrations/20260625223000_add_tournament_formats_and_games.sql
\ir ../../supabase/migrations/20260625224500_allow_organizer_match_reporting.sql
\ir ../../supabase/migrations/20260626000000_add_match_report_confirmations.sql
\ir ../../supabase/migrations/20260626001500_fix_match_report_confirmation_submitter.sql
\ir ../../supabase/migrations/20260626003000_allow_tournament_and_invite_deletes.sql
\ir ../../supabase/migrations/20260630090000_add_doubles_and_achievements.sql
\ir ../../supabase/migrations/20260630093000_apply_doubles_to_profile_rating.sql
\ir ../../supabase/migrations/20260630100000_remove_personal_doubles_rating.sql
\ir ../../supabase/migrations/20260630101500_add_profile_card_style.sql
\ir ../../supabase/migrations/20260630103000_simplify_profile_card_styles.sql
\ir seed-seasons.sql
\ir ../../supabase/migrations/20260908090000_add_seasons.sql
\ir assert-seasons.sql
