# Design: Improve skill add UX

## Context

The add command currently resolves one skill and uses a comma-separated prompt.
The existing agent list is deliberately non-authoritative.

## Decisions

- Parse repeated flags into one shared add request and reject duplicates before
  side effects.
- Build candidate manifest/lock entries in memory; invoke upstream only after
  all resolution succeeds; write Skillset files after all installs succeed.
- Use a small Bun-compatible prompt library behind an injectable chooser. Its
  options derive solely from a bundled `{id, displayName}` registry.
- Preserve explicit arbitrary agents, and use simple substring/token matches for
  optional invalid-agent suggestions rather than fuzzy-search dependencies.

## Risks / Trade-offs

- [Later install mutates agent directories] → retain current recovery model:
  run `skillset install` from the unchanged lock.
- [Prompt lacks a TTY] → `--yes` remains the deterministic automation path.
