-- Adds a reaction with the per-IP rate limit and the per-photo cap checked
-- and written in one transaction. Advisory locks serialise concurrent calls
-- for the same IP and for the same photo, so simultaneous requests can no
-- longer all pass the count before any of them inserts.
--
-- Returns {"status": "ok", "reaction": {...}} or {"status": "rate_limited" |
-- "not_found" | "cap_reached"}. The rate-limit row is kept for every attempt
-- that gets past the rate check, as before.
CREATE OR REPLACE FUNCTION add_reaction(
  p_image_id       uuid,
  p_ip             text,
  p_emoji          text,
  p_reactor_name   text,
  p_pos_x          double precision,
  p_pos_y          double precision,
  p_rotation       double precision,
  p_owner_key_hash text,
  p_cap            int,
  p_rate_max       int,
  p_rate_window_s int
) RETURNS jsonb
  LANGUAGE plpgsql AS $$
DECLARE
  r reactions;
BEGIN
  -- One reacting IP at a time
  PERFORM pg_advisory_xact_lock(1, hashtext(p_ip));
  IF (SELECT count(*) FROM reaction_rate_limits
      WHERE ip = p_ip AND created_at >= now() - make_interval(secs => p_rate_window_s)) >= p_rate_max THEN
    RETURN jsonb_build_object('status', 'rate_limited');
  END IF;
  INSERT INTO reaction_rate_limits (ip) VALUES (p_ip);

  -- One reaction per photo at a time
  PERFORM pg_advisory_xact_lock(2, hashtext(p_image_id::text));
  IF NOT EXISTS (SELECT 1 FROM images WHERE id = p_image_id) THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF (SELECT count(*) FROM reactions WHERE image_id = p_image_id) >= p_cap THEN
    RETURN jsonb_build_object('status', 'cap_reached');
  END IF;

  INSERT INTO reactions (image_id, emoji, reactor_name, pos_x, pos_y, rotation, owner_key_hash)
  VALUES (p_image_id, p_emoji, p_reactor_name, p_pos_x, p_pos_y, p_rotation, p_owner_key_hash)
  RETURNING * INTO r;

  RETURN jsonb_build_object('status', 'ok', 'reaction', to_jsonb(r) - 'owner_key_hash');
END;
$$;

-- Only the API (service role) may call it.
REVOKE ALL ON FUNCTION add_reaction(uuid, text, text, text, double precision, double precision, double precision, text, int, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_reaction(uuid, text, text, text, double precision, double precision, double precision, text, int, int, int) TO service_role;
