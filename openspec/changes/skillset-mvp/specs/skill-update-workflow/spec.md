# Spec Delta

## Purpose

Defines safe source re-resolution and optional version-control publication so a
new lock never claims skill revisions that did not install successfully.

## ADDED Requirements

### Requirement: Update resolves, verifies, installs, then publishes the lock
`skillset update` SHALL resolve every configured Git source's requested ref to
a commit, discover the requested skill in a checkout of that commit, calculate
the selected-directory hash, and form a candidate lock. It SHALL verify and
install every candidate using the locked-install procedure before replacing
`skillset.lock`. It MUST atomically replace the lock only after all candidate
installs succeed. Local source entries SHALL be rehashed and included in the
candidate lock; they are not source-updated by Git resolution.

#### Scenario: A newer Git revision installs successfully
- **WHEN** a requested ref resolves to a newer commit and all candidate installs succeed
- **THEN** Skillset atomically writes a lock containing that commit and its verified hash

#### Scenario: A candidate install fails
- **WHEN** any candidate cannot be resolved, verified, or installed
- **THEN** Skillset preserves the previous `skillset.lock` and reports that installed directories from earlier candidates may require `skillset install` to restore the previous lock

### Requirement: Optional commit and push follow lock replacement
When `update.commit` is true, Skillset SHALL commit the changed Skillset-owned
state after the new lock has been atomically written. When `update.push` is
true, it SHALL push only after that commit succeeds. A commit or push failure
MUST NOT roll back the successfully installed state or the new lock; Skillset
MUST report the state and recovery action. `push: true` MUST require
`commit: true`.

#### Scenario: Push fails after a successful update commit
- **WHEN** installation, lock replacement, and commit succeed but push fails
- **THEN** the new lock and local commit remain and Skillset reports that the user can retry the push

### Requirement: Upstream interfaces have explicit boundaries
Skillset SHALL classify `npx skills add` and its documented flags/source forms
as supported interfaces. It MAY observe `add --json` or `list --json` only
against its release-pinned upstream version, ignoring unknown fields and never
using their schemas as persistence. It MUST avoid relying on undocumented
upstream state, including `skills-lock.json`, `.skill-lock.json`, source-code
agent registries, the hidden `check` alias, commit-fragment parsing, and update
implementation details. `npx skills update` MUST NOT be used to update
Skillset-managed project state.

#### Scenario: Upstream changes its experimental project lock
- **WHEN** a supported `npx skills` release changes its experimental lock schema
- **THEN** Skillset's resolution and locked installation remain based on `skillset.lock` and verified source content
