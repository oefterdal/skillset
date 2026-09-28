# Design: Skillset MVP

## Context

See [proposal.md](proposal.md) for motivation. The investigation establishes
that upstream's project and global locks are experimental, no documented agent
enumeration API exists, and direct Git commit source pinning is observed but
not documented. The design therefore gives Skillset ownership of resolution
and integrity while retaining `npx skills` for its documented installation
role.

## Goals / Non-Goals

**Goals:**

- Make a committed `skillset.lock` sufficient to locate and verify each managed
  skill's exact Git or portable-local content.
- Keep `npx skills` as the installer and agent validator.
- Make updates failure-safe with respect to the declared lock state.
- Offer useful interactive agent selection without treating a convenience list
  as a compatibility contract.

**Non-Goals:**

- Supporting upstream experimental lock migration or restore commands.
- Managing global skills, manipulating agent directories, or discovering agents
  through upstream implementation details.
- Removing the Node/npm/npx dependency imposed by invoking `npx skills`.
- Treating an absolute local directory as cross-machine reproducible.

## Decisions

### Skillset owns resolution and lock data

`skillset.yaml` declares desired source/ref, selected skill name, agents, and
copy behavior. `skillset.lock` is a versioned JSON materialization of that
declaration. Git entries retain a canonical clone URL, requested ref, resolved
commit, discovered selected path, and hash. Local entries retain a normalized
repository-relative path, selected path, and hash. The exact schemas and hash
format are normative in the specs.

`skillsCliVersion` is deliberately absent from `skillset.lock`: a CLI version
does not identify source content or affect resolving the locked commit. Each
Skillset release instead pins its supported `skills` npm package version in its
own runtime/tooling configuration and invokes `npx skills@<version>`. This
keeps consumer locks about dependencies while fixing the installer behavior
that Skillset has tested.

Alternative: copy upstream `skills-lock.json` or record its CLI version in the
consumer lock. Both couple consumers to upstream experimental state without
improving source-content reproducibility.

### Verified local checkout bridges the documented-interface gap

For a Git lock entry, Skillset fetches the recorded canonical URL, verifies the
recorded commit object, and checks it out detached in a temporary directory.
It hashes the locked selected directory and invokes `npx skills add` using that
verified local source. This does not depend on undocumented `#commit` parsing
by the upstream CLI. For a local entry, it verifies the repository-relative
source and hash directly. The temporary checkout is deleted after its upstream
installation invocation completes.

Alternative: pass a Git URL with a commit fragment. The investigation observed
that behavior but does not document it, so it cannot underpin reproducibility.

### Installation and update are separate transactions

`install` consumes the existing lock and never resolves moving refs. `update`
first builds an in-memory candidate lock, then performs each verified install.
Only after all installs succeed does it atomically replace `skillset.lock`.
This prevents a lock from claiming an uninstalled candidate. Since upstream
installation mutates project directories and has no transaction API, a failed
multi-entry update can leave some directory changes in place; preserving the
old lock makes `skillset install` the defined recovery operation.

Skillset does not call `npx skills update` for managed state because upstream
updates unpinned sources rather than content-addressed revisions.

### Interactive agents use curated convenience data

The executable bundles a small, versioned list of recognized agent IDs strictly
for the selector UI. `defaults.agents` is preselected. The UI includes an
"other ID" path and manifest/CLI supplied IDs bypass membership checks. Every
final ID is forwarded to `npx skills add`, whose response is authoritative.

Alternative: parse the README or import the upstream registry at runtime. No
documented enumeration interface exists, and either approach introduces a
fragile dependency on internals.

### Integration boundary

| Classification | Integration |
| --- | --- |
| Documented/supported | `npx skills add`, `--skill`, `--agent`, `--yes`, `--copy`, local source paths, project installs, and Node/npm/npx execution. |
| Observed, intentionally minimized | `add --json` and `list --json` output shapes, only if needed for diagnostics against the release-pinned package; unknown fields are ignored. |
| Undocumented and avoided | `skills-lock.json`/`.skill-lock.json` schemas, `check`, agent registry/README parsing, Git commit fragments, and updater internals. |

## Risks / Trade-offs

- [Git host/network cannot supply the locked commit] → Fail before installation and retain the lock; document credential and network requirements.
- [A multi-entry update fails after earlier installs] → Retain the old lock and direct users to rerun `skillset install` to restore it.
- [Upstream installer behavior changes] → Pin the upstream package per Skillset release and test compatibility before changing that pin.
- [Curated agent list becomes stale] → Keep it explicitly non-authoritative and allow arbitrary IDs.
- [Directory includes unsupported filesystem objects] → Reject it rather than produce a platform-dependent hash.

## Migration Plan

New projects add `skillset.yaml`, run the resolution/update command to generate
`skillset.lock`, and commit both. Existing upstream `skills-lock.json` files
are ignored; users declare their sources explicitly. A failed update leaves
the old lock intact. A successful lock replacement followed by failed commit
or push is recovered by committing or pushing the already-written state.
