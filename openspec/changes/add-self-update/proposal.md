# Proposal: Add self-update

## Why

Users can install Skillset from GitHub Releases but must currently rerun the
curl installer to update the executable. A built-in command makes that update
discoverable and safe.

## What Changes

- Add `skillset self-update`, separate from managed-skill `skillset update`.
- Query the documented GitHub Releases API for the latest stable release.
- Verify the platform binary with its release SHA-256 asset before atomically
  replacing the current executable.
- Preserve the original executable on every download, metadata, checksum, or
  replacement failure.

## Capabilities

### New Capabilities
- `self-update`: Safely replace the running Skillset executable from releases.

### Modified Capabilities

None.

## Impact

Adds HTTP, semantic-version, executable-path, checksum, and replacement logic
to the Bun CLI. It uses the existing GitHub Release artifact conventions.
