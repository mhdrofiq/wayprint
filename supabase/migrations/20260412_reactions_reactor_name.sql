-- Add reactor name to reactions so viewers can identify their stickers
ALTER TABLE reactions
  ADD COLUMN reactor_name text NOT NULL DEFAULT 'anon';

-- Allow public DELETE so viewers can remove their own reactions via the API
CREATE POLICY "reactions_delete_public"
  ON reactions FOR DELETE
  TO anon, authenticated
  USING (true);
