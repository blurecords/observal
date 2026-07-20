-- Device connection test results (from collector or demo mode)

ALTER TABLE av_devices
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_message TEXT,
  ADD COLUMN IF NOT EXISTS last_test_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS test_requested_at TIMESTAMPTZ;
