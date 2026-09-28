# Design: Self-update

## Context

Release assets and checksums already use `skillset-<os>-<arch>` in the release
workflow and installer. The CLI is a standalone Bun executable, so it can
replace its on-disk binary without requiring Bun.

## Goals / Non-Goals

**Goals:** use the public GitHub Releases API, preserve the existing executable
until verification completes, and provide concise status output.

**Non-Goals:** updating managed skills, running `install.sh`, prerelease
selection, privilege escalation, or changing release asset names.

## Decisions

- Share small platform and release-metadata helpers with the CLI; use native
  `fetch` rather than an SDK.
- Treat the API's `releases/latest` endpoint as the stable-release authority.
- Normalize `v` tags and compare dot-separated numeric semantic versions; reject
  unsupported prerelease/version metadata for this MVP rather than guessing.
- Resolve symlinks with `realpath`, write a verified sibling temporary file, and
  rename it over the resolved target. This preserves a launcher symlink and is
  atomic on the same filesystem.
- Check writability through the replacement attempt. Errors name the target and
  advise reinstalling to a writable path; no `sudo` is attempted.

## Risks / Trade-offs

- [GitHub API rate limit or outage] → report the API failure and retain binary.
- [Windows has different replacement semantics] → MVP release targets remain
  Linux and macOS, matching the existing installer.
- [Target is in use] → report replacement failure without modifying it.

## Migration Plan

No migration. Existing installs gain the command when updated through the
installer or a release binary.
