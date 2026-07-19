-- Bump collector config_version when AV devices change (Pi picks up on poll)

CREATE OR REPLACE FUNCTION bump_collector_config_on_device_change()
RETURNS TRIGGER AS $$
DECLARE
  target_collector UUID;
BEGIN
  target_collector := COALESCE(NEW.collector_id, OLD.collector_id);
  IF target_collector IS NOT NULL THEN
    UPDATE collectors
    SET config_version = config_version + 1, updated_at = now()
    WHERE id = target_collector;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER av_devices_bump_config
  AFTER INSERT OR UPDATE OR DELETE ON av_devices
  FOR EACH ROW EXECUTE FUNCTION bump_collector_config_on_device_change();

-- Allow authenticated users to insert collectors is handled via edge function.
-- Ensure venues/rooms/devices inserts include organization_id from profile.
