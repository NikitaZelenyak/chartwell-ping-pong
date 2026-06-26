drop policy if exists "Organizers can delete tournaments" on public.tournaments;
create policy "Organizers can delete tournaments"
on public.tournaments for delete
to authenticated
using (organizer_id = auth.uid());

drop policy if exists "Invite participants can delete invites" on public.match_invites;
create policy "Invite participants can delete invites"
on public.match_invites for delete
to authenticated
using (created_by = auth.uid() or opponent_id = auth.uid());
