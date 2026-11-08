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

`.claude/settings.json` lets sessions run `.claude/skills/statechart/scripts/statechart` without
auto mode's outside-code check. That rule rests on a review of the scripts at the commit above:
the only processes they start are Java (TLC), Node, a kill of their own process group, and
`mise install` when `TLA2TOOLS` is unset. They write only to their own temp folders and the
`--out` folder. The other 3,100 lines are pure transforms with no I/O. **Any update to
`scripts/` must be read in full again before it is committed**, or the rule should go.

To update, copy the three folders from a newer pstack again and re-apply these changes.
