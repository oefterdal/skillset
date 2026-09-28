# Spec Delta

## Purpose

Ensures a lock installs the exact resolved skill contents while retaining
`npx skills` for skill discovery, placement, links, copies, and agent checks.

## ADDED Requirements

### Requirement: Locked installation uses verified source content
`skillset install` SHALL require a valid `skillset.lock` that corresponds to
the manifest's entries and effective install settings. For each locked Git
entry, Skillset MUST fetch the canonical repository, verify that the recorded
commit object exists and is a commit, create a detached temporary checkout at
that exact commit, find `skill.path`, and recompute `directoryHash`. For each
portable local entry, it MUST resolve `source.path` beneath the consumer
repository, find `skill.path`, and recompute the hash. It MUST fail before
calling `npx skills` for an entry whose source, path, commit, or hash fails
verification.

#### Scenario: Locked Git commit is available and unmodified
- **WHEN** the recorded commit and selected directory hash verify successfully
- **THEN** Skillset installs from the temporary checkout of that exact commit

#### Scenario: Locked source cannot be verified
- **WHEN** the recorded commit is unavailable or the selected directory hash differs
- **THEN** Skillset exits with an error and does not invoke `npx skills` for that entry

### Requirement: Installation delegates only documented behavior
After verification, Skillset SHALL invoke its release-pinned `npx skills` as
`npx skills@<supported-version> add <verified-local-source> --skill <name>
--agent <id>... --yes`, adding `--copy` when the lock requires it. Skillset
MUST use project scope and MUST delegate discovery, target validation,
placement, symlink/copy mechanics, and upstream-managed metadata to that CLI.
It MUST NOT depend on Git commit fragments in `npx skills` source arguments,
the `check` alias, upstream lock schemas, upstream agent registries, or
undocumented update internals.

#### Scenario: Upstream validates an unknown agent ID
- **WHEN** a lock contains an agent ID unknown to Skillset's convenience list
- **THEN** Skillset passes it to `npx skills` and surfaces that command's result

### Requirement: Runtime dependency boundary
Skillset SHALL be written, developed, tested, and compiled with Bun, and SHALL
be distributed as standalone executables through GitHub Releases. Running a
released executable SHALL not require Bun. Running an operation that delegates
to `npx skills` SHALL require an available Node.js/npm/npx runtime and network
or npm-cache access sufficient to execute the release-pinned package.

#### Scenario: End user runs a release executable without Bun
- **WHEN** Node/npm/npx are available but Bun is not installed
- **THEN** Skillset can perform a verified install through `npx skills`
