# Collector announce (Pi boot / heartbeat)

Called by the Pi agent on startup. Requires `hardware_id` registered in `devices_factory`.

Deploy:

```bash
supabase functions deploy collectors-announce
```

`verify_jwt = false` in `supabase/config.toml` — the Pi uses `SUPABASE_ANON_KEY` for the gateway and `hardware_id` for authorization inside the function.
