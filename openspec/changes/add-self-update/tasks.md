# Tasks

## 1. Release metadata and platform helpers

- [ ] 1.1 Add platform and release-asset helpers shared with self-update; verify supported platform names and missing assets in unit tests
- [ ] 1.2 Add semantic-version normalization and comparison; verify equal, newer, older, and malformed versions in unit tests
- [ ] 1.3 Add a fetch boundary for GitHub Releases metadata and assets; verify API, rate-limit, metadata, and download errors with mocks

## 2. Verified replacement

- [ ] 2.1 Download binary and checksum into a temporary directory and verify SHA-256; verify mismatch leaves the existing executable unchanged
- [ ] 2.2 Resolve executable symlinks and atomically replace the target with a verified sibling file; verify symlink preservation and successful replacement in temporary directories
- [ ] 2.3 Report replacement permission failures with the target path and recovery guidance; verify no replacement or privilege escalation occurs

## 3. Command and validation

- [ ] 3.1 Add `skillset self-update` help and concise current/latest, success, and up-to-date output; verify command behavior through mocked boundaries
- [ ] 3.2 Run Bun tests, lint, typecheck, build, OpenSpec validation, diff check, and compiled `self-update --help` smoke test
