# Spec Delta

## Purpose

Lets an installed Skillset executable safely update itself from the latest
stable GitHub Release without invoking the shell installer.

## ADDED Requirements

### Requirement: Self-update command
Skillset SHALL provide `skillset self-update`, distinct from `skillset update`.
It SHALL query `https://api.github.com/repos/oefterdal/skillset/releases/latest`,
parse its release tag, normalize an optional leading `v`, and compare it to the
CLI version using semantic-version numeric precedence.

#### Scenario: Current release is already installed
- **WHEN** the normalized latest version equals the running CLI version
- **THEN** the command exits successfully without downloading assets and reports that it is up to date

#### Scenario: A newer release exists
- **WHEN** the latest normalized semantic version is greater than the running version
- **THEN** the command reports both versions and attempts a verified update

### Requirement: Platform release asset verification
Skillset SHALL use the existing `skillset-<os>-<arch>` and `.sha256` release
asset names. It MUST download both to a temporary directory, parse the expected
SHA-256, and verify the binary before replacing any executable. It MUST report
clear errors for unavailable API data, malformed metadata, missing platform
assets, download failures, missing checksums, and checksum mismatches.

#### Scenario: Checksum mismatch
- **WHEN** a downloaded binary does not match its release checksum
- **THEN** Skillset exits non-zero, removes temporary data, and leaves the existing executable unchanged

### Requirement: Safe executable replacement
Skillset SHALL resolve the currently running executable path, resolving
symlinks to the target binary before replacement. It SHALL atomically rename a
verified temporary binary into that resolved target path when supported. If the
target is not writable or replacement fails, it MUST leave the original binary
unchanged, report the path and recovery action, and never invoke `sudo`.

#### Scenario: Symlinked executable
- **WHEN** Skillset is launched through a symlink
- **THEN** it replaces the symlink target and preserves the symlink itself

#### Scenario: Replacement failure
- **WHEN** the verified binary cannot replace the resolved target
- **THEN** Skillset exits non-zero and reports that the existing installation was not modified
