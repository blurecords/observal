# Collector poll (config + activation)

Called periodically by the Pi to fetch config, ingest token rotation, and activation status.

Deploy:

```bash
supabase functions deploy collectors-poll
```

`verify_jwt = false` in `supabase/config.toml` — the Pi uses `SUPABASE_ANON_KEY` for the gateway and `x-collector-hardware-id` for authorization inside the function.
