-- Combined brief 5e: keep the agent programme switched off in production until its Phase 6 acceptance.
-- The screens are built (/dev previews); staff switch it on in Settings when the backend is accepted.
update public.settings set value = 'false', updated_at = now() where key = 'agents_enabled';
