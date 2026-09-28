# Spec Delta

## Purpose

Lets users add several skills from one source without committing partial
Skillset-owned state when resolution or installation fails.

## ADDED Requirements

### Requirement: Repeated skill selection
`skillset add <source>` SHALL accept one or more repeated `--skill <name>`
flags. Every selected skill SHALL share the source, ref, agents, and copy mode.
It MUST reject duplicate names in one invocation and skip entries already
declared with the same source, ref, and skill name.

#### Scenario: Add two skills from one source
- **WHEN** the user supplies two distinct `--skill` flags
- **THEN** Skillset resolves, installs, and records both with the shared settings

### Requirement: Add state is transactional
Skillset SHALL resolve and verify every new selected skill, then install every
one, before writing `skillset.yaml` or `skillset.lock`. On any failure it MUST
leave both files unchanged and report that a later failed installation may have
changed agent directories; `skillset install` restores declared state.

#### Scenario: Second selected skill fails
- **WHEN** the second skill cannot resolve, verify, or install
- **THEN** the manifest and lock do not claim either new skill
