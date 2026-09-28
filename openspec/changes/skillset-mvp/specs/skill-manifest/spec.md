# Spec Delta

## Purpose

Defines the portable desired state that Skillset resolves, installs, and records
without coupling projects to the upstream experimental lock format.

## ADDED Requirements

### Requirement: Versioned manifest schema
Skillset SHALL read a `skillset.yaml` document with this version-1 schema:

```yaml
version: 1
defaults:
  agents: [<agent-id>, ...] # optional
  copy: <boolean> # optional; defaults to false
update:
  commit: <boolean> # optional; defaults to false
  push: <boolean> # optional; defaults to false; requires commit: true
skills:
  - source: <git-url-or-repository-relative-path>
    ref: <git-ref> # optional for Git sources; defaults to the remote default branch
    skill: <skill-name>
    agents: [<agent-id>, ...] # optional; otherwise defaults.agents
    copy: <boolean> # optional; otherwise defaults.copy
```

`version`, `skills`, each `source`, and each `skill` MUST be present. Each
entry's effective agent list MUST be nonempty. `ref` MUST be absent for local
sources. A local source MUST be repository-relative for reproducible use;
Skillset MAY accept an absolute local source only as an explicitly reported
non-portable developer override.

#### Scenario: Defaults supply targets and copy mode
- **WHEN** a skill omits `agents` and `copy` and `defaults` supplies both
- **THEN** Skillset uses those defaults for that skill

#### Scenario: Invalid effective agent list
- **WHEN** neither a skill nor `defaults` supplies an agent ID
- **THEN** Skillset rejects the manifest before resolving or installing skills

### Requirement: Agent selection remains upstream-authoritative
For an interactive command needing agents, Skillset SHALL present a small,
versioned Skillset-maintained convenience list of known agent IDs and preselect
the IDs in `defaults.agents`. The list is non-authoritative. The interaction
MUST allow arbitrary additional agent IDs, and configuration MUST allow any
nonempty agent ID string. Skillset MUST pass selected IDs to `npx skills` and
MUST let that CLI provide authoritative validation.

#### Scenario: A configured agent is absent from the convenience list
- **WHEN** a manifest specifies an agent ID not in Skillset's known list
- **THEN** Skillset passes the ID to `npx skills` without rejecting it locally

#### Scenario: Interactive user supplies an arbitrary ID
- **WHEN** a user enters an agent ID that is absent from the known list
- **THEN** Skillset includes it in the `npx skills` invocation and reports that CLI's validation result

### Requirement: Lock schema is Skillset-owned
Skillset SHALL own `skillset.lock` and SHALL neither read nor write upstream
`skills-lock.json`. The lock is UTF-8 JSON with this version-1 tagged schema:

```json
{
  "version": 1,
  "skills": [
    {
      "source": {
        "kind": "git",
        "declared": "owner/repository",
        "canonicalUrl": "https://host/owner/repository.git",
        "requestedRef": "main",
        "commit": "<40-lowercase-hex-git-commit>"
      },
      "skill": {
        "name": "<manifest-skill-name>",
        "path": "<slash-separated-path-relative-to-source-root>",
        "directoryHash": { "algorithm": "sha256", "value": "<64-lowercase-hex>" }
      },
      "install": { "agents": ["<agent-id>"], "copy": false }
    },
    {
      "source": {
        "kind": "local",
        "declared": "./relative/path",
        "path": "relative/path"
      },
      "skill": {
        "name": "<manifest-skill-name>",
        "path": "<slash-separated-path-relative-to-source-root>",
        "directoryHash": { "algorithm": "sha256", "value": "<64-lowercase-hex>" }
      },
      "install": { "agents": ["<agent-id>"], "copy": false }
    }
  ]
}
```

Entries MUST be sorted by the canonical serialization of `source` followed by
`skill.name`; agent arrays MUST preserve the manifest's declared order. A Git
entry MUST contain all Git fields. A portable local entry MUST contain only the
shown local fields and a normalized path with no `..` segment. `skillsCliVersion`
MUST NOT appear in this lock: it changes installer behavior, not the resolved
skill dependency content. The Skillset release/tooling configuration SHALL pin
the supported `skills` package version separately.

#### Scenario: A lock is generated from a Git skill
- **WHEN** Skillset resolves and installs a Git manifest entry successfully
- **THEN** its lock entry records the requested ref, canonical URL, immutable commit, selected path, hash, and effective install settings

### Requirement: Deterministic selected-directory hash
Skillset SHALL hash a selected skill directory as SHA-256 over UTF-8 records in
lexicographic byte order of slash-separated relative paths. It MUST emit the
literal header `skillset-directory-v1\\n`; then, for every directory emit
`D <path>\\n`, and for every regular file emit `F <path> <byte-length>\\n`, its
raw bytes, and `\\n`. The root is represented by `D .\\n`. Paths MUST be NFC
Unicode, contain no `.` or `..` segment, and use `/`. Skillset MUST reject a
directory containing a symlink, device, socket, FIFO, unreadable entry, or path
that escapes the selected directory.

#### Scenario: Content differs at a locked path
- **WHEN** a selected directory has a file whose bytes differ from the locked content
- **THEN** its computed directory hash differs and Skillset fails before installation
