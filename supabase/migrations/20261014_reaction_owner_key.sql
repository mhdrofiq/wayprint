-- Reactions are only written through the API (service role), which enforces
-- the per-photo cap, rate limit and emoji check. Remove the public write
-- policies so the anon key can't insert or delete reactions directly.
DROP POLICY IF EXISTS "reactions_insert_public" ON reactions;
DROP POLICY IF EXISTS "reactions_delete_public" ON reactions;

-- SHA-256 of the random key the reacting browser keeps in localStorage.
-- DELETE /api/reactions/:id requires the matching key (or the admin token).
-- Null for reactions made before this column existed: only the admin can remove those.
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS owner_key_hash text;
