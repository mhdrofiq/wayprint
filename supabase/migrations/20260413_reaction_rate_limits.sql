-- Rate limiting table for public reaction submissions
CREATE TABLE reaction_rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast window queries by IP
CREATE INDEX reaction_rate_limits_ip_created_at
  ON reaction_rate_limits (ip, created_at DESC);

-- Auto-purge rows older than 1 hour to keep the table small
CREATE OR REPLACE FUNCTION purge_old_rate_limits() RETURNS void
  LANGUAGE sql SECURITY DEFINER AS $$
    DELETE FROM reaction_rate_limits WHERE created_at < now() - interval '1 hour';
  $$;

-- RLS: no direct client access — only the service role key (API routes) touches this table
ALTER TABLE reaction_rate_limits ENABLE ROW LEVEL SECURITY;
