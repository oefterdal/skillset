# Tasks

## 1. Project and runtime foundation

- [x] 1.1 Scaffold the TypeScript CLI, Bun development/test scripts, and standalone Bun release builds; verify a built executable runs without Bun installed
- [x] 1.2 Pin the supported `skills` npm package version in Skillset release/runtime configuration; verify every upstream invocation uses `npx skills@<pinned-version>`
- [x] 1.3 Add manifest and lock parsing with version validation; verify valid and invalid schema fixtures produce the specified outcomes

## 2. Manifest and agent experience

- [x] 2.1 Implement `skillset.yaml` defaults and per-skill effective settings; verify defaults, overrides, and missing effective agents with unit tests
- [x] 2.2 Bundle a versioned non-authoritative agent convenience list and interactive selector with preselected `defaults.agents` plus arbitrary-ID entry; verify unknown IDs reach the upstream invocation unchanged
- [x] 2.3 Implement portable-local path validation and explicit absolute-path override reporting; verify escaping paths and unsupported local entries fail safely

## 3. Resolution and lock integrity

- [x] 3.1 Implement Git source canonicalization, ref resolution, detached temporary commit checkout, and selected skill discovery; verify a fixture resolves a recorded 40-character commit
- [x] 3.2 Implement the normative deterministic directory hash and unsupported-entry rejection; verify stable hashes, byte changes, path ordering, and symlink rejection
- [x] 3.3 Generate sorted `skillset.lock` entries from verified resolution; verify generated fixtures exactly match the version-1 lock schema

## 4. Reproducible installation

- [x] 4.1 Implement locked Git and portable-local verification before installation; verify a missing commit or mismatched hash produces no upstream invocation for that entry
- [x] 4.2 Invoke the pinned `npx skills add` with verified local sources, effective skill/agent/copy settings, and project scope; verify command construction and upstream error propagation
- [x] 4.3 Document Node/npm/npx runtime requirements and the supported-upstream boundary; verify documented commands and dependency requirements match executable behavior

## 5. Update and recovery

- [x] 5.1 Implement candidate re-resolution, local rehashing, and verified candidate installs without calling `npx skills update`; verify branch movement produces a new candidate commit and hash
- [x] 5.2 Implement atomically replace `skillset.lock` only after all candidate installs succeed; verify an induced later failure preserves the prior lock and reports restoration with `skillset install`
- [x] 5.3 Implement optional post-replacement commit and push behavior; verify failed commit or push leaves the successfully installed lock state recoverable and reports the next action

## 6. Release and integration verification

- [ ] 6.1 Add release automation for Bun standalone executables and GitHub Releases; verify release artifacts execute on each supported platform
- [ ] 6.2 Run end-to-end fixtures for locked Git installation, local installation, update failure recovery, unknown agent validation, and no-Bun execution; verify each scenario matches the OpenSpec requirements
