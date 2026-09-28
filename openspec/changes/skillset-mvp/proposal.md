# Proposal: Skillset MVP

## Why

`npx skills` installs and links agent skills, but its project lock is experimental
and an unpinned remote source can change between machines. Teams need a committed,
declarative record of the exact skills and revisions assigned to their agents.

## What Changes

- Add a Bun-built TypeScript CLI distributed as standalone GitHub Release
  executables.
- Define `skillset.yaml` as the committed declaration of Git and repository-local
  skills, selected skill names, target agent IDs, copy mode, and update commit
  settings.
- Define a Skillset-owned `skillset.lock` that records immutable Git commits and
  deterministic directory hashes. Do not read or write the upstream experimental
  `skills-lock.json`.
- Define reproducible `skillset install`: verify the locked content in a staging
  directory, then delegate skill discovery, placement, and linking/copying to
  `npx skills add` using that verified local directory.
- Define `skillset update`: re-resolve configured Git refs, stage and install
  candidates, and atomically replace `skillset.lock` only after every selected
  install succeeds. Optionally commit and push Skillset-owned state.
- Provide a versioned Skillset-maintained, non-authoritative list of known
  agent IDs for interactive selection, preselecting `defaults.agents`. Accept
  arbitrary configured or entered IDs and let `npx skills` validate them.
- Exclude upstream-lock migration, global-scope management, source discovery
  search, and direct manipulation of agent skill directories from the MVP.

## Capabilities

### New Capabilities

- `skill-manifest`: Declarative configuration for managed skills, local paths,
  agent assignments, and update-commit settings.
- `reproducible-skill-install`: Immutable resolution, integrity verification,
  and installation of the revision recorded in `skillset.lock`.
- `skill-update-workflow`: Safe re-resolution, installation, lock replacement,
  and optional Git commit/push behavior.

### Modified Capabilities

None.

## Impact

The MVP adds a TypeScript/Bun CLI, YAML and JSON parsing, Git subprocess use,
and GitHub Release packaging. Runtime installation still requires Node/npm/npx
and Skillset's release-pinned `skills` package version because Skillset delegates to
`npx skills`; end users do not need Bun to run the released executable.
