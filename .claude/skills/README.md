# Vendored pstack skills

`statechart`, `create-formal-verification-skill` and `maintain-formal-verification-skill`
come from pstack by Lauren Tan (poteto). Upstream is cursor/plugins (folder `pstack`), and
this copy came from the backnotprop/pstack mirror at commit
a6342ded43a2437e3c664b46c2cff103787773fd. They are MIT licensed, and each folder keeps the
LICENSE.

Changes from upstream:

- Removed `disable-model-invocation`, so Claude can use the skills when asked in plain words,
  not only through a slash command.
- `statechart`: dropped `scripts/test` and its npm scripts. Added "In wayprint's cloud
  sessions" (TLC without mise, phone-friendly charts, local bug replays).
- `create-formal-verification-skill`: added where generated verify skills go in this repo,
  and the shared-database rule.

To update, copy the three folders from a newer pstack again and re-apply these changes.
