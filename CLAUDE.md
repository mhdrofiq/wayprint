@AGENTS.md

# Working on Wayprint

The owner directs work from their phone through Claude Code cloud sessions. They
review results on Vercel deployments, not locally, so every change must reach a
deployed URL before it counts as done.

## Branches and deployments

| Branch | Role | Deploys to |
|---|---|---|
| `master` | Production | wayprint.vercel.app |
| `staging` | Preview the owner reviews before shipping | Vercel preview for the `staging` branch |
| `claude/*` | One per session, where Claude works | Its own Vercel preview |

Every push to any branch triggers a Vercel build. Previews use the production
Supabase database and R2 bucket, so anything done in the admin panel on a
preview changes live data.

## Workflow

Decide first whether the request is a **small change** or a **regular change**.
When unsure, treat it as regular.

**Small change**: copy or text edits, styling/CSS tweaks, or a contained fix of a
few lines that touches no API route, database query, auth, upload pipeline or
dependency. These go straight to production:

1. Make the change on the session branch and run the checks below.
2. Open a PR from the session branch into `master` and merge it right away.
3. Bring `master` into `staging` (PR `master` → `staging`, merge) so the two
   branches don't drift.
4. Report what changed and that production is redeploying.

**Regular change**: everything else. It goes through `staging` first:

1. Make the change on the session branch and run the checks below.
2. Open a PR from the session branch into `staging` and merge it.
3. Tell the owner the change is on the staging preview, and list what to
   look at. Then wait.
4. Iterate on feedback the same way (session branch → `staging`).
5. Only when the owner says **"ship it"**: open a PR from `staging` into
   `master` and merge it with a merge commit (not squash), so `staging`
   and `master` keep a shared history.

Never merge into `master` without either the small-change rule applying or an
explicit "ship it". If `staging` holds unshipped work from another session,
mention it before shipping, because shipping `staging` ships all of it.

Use the GitHub MCP tools for PRs and merges. Start each session by fetching
`staging` and `master` so you build on the latest state.

## Checks before pushing

- `pnpm install` (new sessions start without `node_modules`)
- `pnpm build` must pass. The cloud environment provides placeholder values for
  every env var, so the build compiles and type-checks but cannot reach real
  services. Real behaviour is verified on the Vercel preview.
- `pnpm lint` currently fails on `master` with existing errors. Don't introduce
  new lint errors in files you touch; don't fix unrelated ones unless asked.

After pushing, if the Vercel deployment fails, fix it before reporting back.

## Reporting back

The owner reads on a phone. Keep replies short:

- One or two lines on what changed.
- Where to look: production or the staging preview, and which page or interaction.
- Anything the owner must decide or do.

Skip code dumps unless asked; the PR holds the diff.

## Conventions

- Package manager: pnpm.
- Commits follow Conventional Commits with a scope, e.g. `feat(pin): ...`,
  `fix(lightbox): ...`, `style: ...`, `chore(pnpm): ...`.
- `PROGRESS.md` tracks notable features and design decisions. Update it when a
  change adds or meaningfully alters a feature, not for small tweaks.
- `wayprint-design.md` is the design reference; follow it for UI work.
