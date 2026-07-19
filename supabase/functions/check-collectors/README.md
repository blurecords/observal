# Scheduled collector health check (every 5 minutes)
# Deploy: supabase functions deploy check-collectors
# Then create cron job in Supabase Dashboard → Integrations → Cron

[functions.check-collectors]
verify_jwt = false

# Example cron (configure in Supabase dashboard):
# schedule: */5 * * * *
# HTTP POST to /functions/v1/check-collectors
# Header: Authorization: Bearer <CRON_SECRET>
