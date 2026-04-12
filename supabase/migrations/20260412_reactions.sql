-- Reactions: emoji stickers added by viewers to images
CREATE TABLE reactions (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id    uuid             NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  emoji       text             NOT NULL,
  pos_x       double precision NOT NULL,  -- 0–1 relative to card width  (may be slightly outside for overhang)
  pos_y       double precision NOT NULL,  -- 0–1 relative to card height (may be slightly outside for overhang)
  rotation    double precision NOT NULL,  -- degrees, small random value
  created_at  timestamptz      NOT NULL DEFAULT now()
);

-- Public can read and insert; only admin (service role) can delete via API
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_public"
  ON reactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "reactions_insert_public"
  ON reactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
