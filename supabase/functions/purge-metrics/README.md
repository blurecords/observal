# purge-metrics

Daily cron to remove metrics and collector heartbeats older than each organization's retention period.

## Schedule (Supabase Dashboard → Cron)

```
0 3 * * *
```

HTTP POST to the function URL with header:

```
Authorization: Bearer <CRON_SECRET>
```

Requires `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` as Edge Function secrets.
