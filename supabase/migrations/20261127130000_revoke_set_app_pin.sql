-- Step 2 of moving PIN setting off the browser (review of #93): every server action now calls
-- set_app_pin_for with the service key after its own check (#95, live), so the browser loses
-- set_app_pin. Settings' change_app_pin, which needs the current PIN, stays.
revoke execute on function public.set_app_pin(text) from public, anon, authenticated;
