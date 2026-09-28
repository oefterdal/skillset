# `npx skills` investigation

**Investigated:** 2026-09-28
**Upstream examined:** `skills@1.7.0`, `vercel-labs/skills` commit
`7407f3893ad4dceab546ac002c3ef806e4000c73` (2026-09-17)

This note distinguishes the published CLI contract from facts learned by reading
the upstream source. Skillset should use the former at runtime and treat the
latter as context only.

## Findings

### Commands and flags

The current help output exposes these commands:

| Command | Relevant interface |
| --- | --- |
| `add <source>` (`a`) | `-g/--global`, `-a/--agent <agents...>`, `-s/--skill <skills...>`, `-l/--list`, `-y/--yes`, `--copy`, `--all`, `--full-depth`, `--json`; also `--metadata` and Eve-only `--subagent` |
| `list` / `ls` | `-g`, `-a/--agent <agents...>`, `--json` |
| `remove` / `rm` | `-g`, `-a`, `-s`, `-y`, `--all` |
| `update [skills...]` / `upgrade` | `-g`, `-p/--project`, `-y` |
| `find [query]` | `--owner <owner>` |
| `use <source>` | `-s/--skill`, `-a/--agent`, `--full-depth` |
| `init [name]` | create a `SKILL.md` template |
| `experimental_install` | restore the upstream project `skills-lock.json` |
| `experimental_sync` | sync skills discovered under `node_modules` |

`check` is accepted by the dispatcher as an alias for `update`, despite being
absent from the user-facing help and README command tables. It is therefore an
implementation convenience, not an interface Skillset should depend on. There
is no documented check-only command: both `check` and `update` run the update
path, which can reinstall changed skills.

Use space-separated option values, for example `--skill my-skill`, rather than
`--skill=my-skill`. The equals form currently has a reported parsing bug.

Sources accepted by `add` include GitHub shorthand (`owner/repo`), GitHub,
GitLab and generic Git URLs, direct `SKILL.md` or supported archive download
URLs, well-known providers, and local filesystem paths such as `./skills/foo`.
The public README also documents private-repository authentication through the
normal Git credential mechanisms.

### Scope and placement

Project install is the default. The canonical project copy is placed under
`./.agents/skills/<sanitized-skill-name>`. Agent-specific project locations are
then linked to that copy where appropriate. A global install (`-g`) uses the
agent's user-level skills location; the canonical global location is currently
`~/.agents/skills` (or the XDG state location for the upstream global lock).

The CLI describes project skill directories as shareable with the project, but
Skillset should not infer that all generated links or agent directories are
safe to commit. Its sync workflow should declare desired state and invoke the
CLI in the project scope; repository ignore rules remain the project's choice.

### Agent selection and discovery

`add --agent <id...>` selects agents by upstream agent identifier; `*` selects
all supported agents. With no explicit selection, the CLI detects installed
agents and prompts, or selects detected/default agents in non-interactive
operation. Some agents share the universal `.agents/skills` directory. Eve has
its own subagent extension (`--subagent root|<name>`).

There is **no documented machine-readable command that lists supported agent
identifiers**. `list --json` lists installed skills and their display names; it
does not enumerate support. The README's Supported Agents table and the
upstream `src/agents.ts` registry are available for humans/source readers, but
are not a stable API. Skillset should pass declared identifiers through to
`skills add`, retain the CLI's validation error as the authoritative check, and
avoid parsing the README or importing upstream TypeScript.

### Persisted source information

For project installations upstream writes `skills-lock.json` in the current
directory. At 1.7.0 it contains a version and per-skill records including
`source`, optional `sourceUrl`, optional `ref`, `sourceType`, optional
`skillPath`, and a SHA-256 `computedHash` of the installed folder. It sorts
skill names and makes local paths relative when possible.

For global installations it writes a separate `.skill-lock.json` in
`$XDG_STATE_HOME/skills/` or `~/.agents/`. Its version-3 entries include
source fields, timestamps, `skillPath`, and `skillFolderHash`. This is a
different schema and is explicitly subject to incompatible migrations.

Neither file is documented as a stable public schema. The project filename is
also coupled to the experimental `experimental_install` command. Skillset must
not use either as its lock-file format or as its source of truth.

### Checks and updates

The installed version's update implementation works differently by scope:

* Global GitHub-backed skills with `skillPath` and `skillFolderHash` are checked
  against a GitHub recursive tree response. It compares the skill directory's
  Git tree SHA to the saved value. If the API cannot be used, it clones and
  compares a local folder hash/tree hash. Local paths, generic Git URLs, and
  entries lacking tracking fields may be skipped.
* Project skills are read from `skills-lock.json`. The CLI groups them by
  source/ref, clones or queries GitHub, discovers skills again, detects moves
  and deletions, then compares hashes. Local and `node_modules` entries are
  excluded from project update checking.
* For a changed skill, `update` reinvokes `add` for that source and skill with
  `-y`; it does not check out a content-addressed resolution. An unpinned
  branch therefore updates to its current tip.

This is useful update behavior, but it does not provide a public,
check-without-change contract and it is not a reproducibility primitive.

### Local-directory skills

`add` recognizes absolute paths, `./...`, `../...`, `.` and platform-specific
absolute paths as local sources. It discovers `SKILL.md` using the same
discovery rules as remote sources and can install selected skill names to
chosen agents. The upstream project lock stores a portable relative local path
when possible, but its experimental restore path is not a content-verifying
local-source resolver, and project update intentionally skips local sources.

For Skillset, a local dependency is reproducible only when its path is relative
to the consumer repository and its contents are available after checkout—for
example as a tracked directory, submodule, or separately restored workspace.
An absolute path can be supported as a developer override but cannot promise
cross-machine reproduction.

### Symlinks and copies

Unless `--copy` is supplied (or the interactive user chooses copying), `add`
uses one canonical copy and creates relative symlinks in compatible
agent-specific directories. Agents sharing `.agents/skills` use that directory
directly. If a symlink fails, upstream falls back to a copy. `--copy` requests
independent copies for all target agents.

Skillset should delegate this whole decision and filesystem layout to `npx
skills`. Its manifest can expose a mode field only as a direct mapping to
`--copy`; it should never construct skill links itself.

## What Skillset can rely on

The practical public boundary is command invocation and its documented flags:

```text
npx skills add <source> --skill <name> --agent <id> --yes [--copy]
npx skills list --json
npx skills update ...
```

`add --json` and `list --json` are useful observational interfaces, although
their result object schemas are not separately versioned. Treat unknown fields
as ignorable and require only the fields Skillset actually consumes after
testing against a pinned CLI version.

Skillset should pin the **CLI package version** in its own tooling or lock
metadata for repeatable behavior. Calling bare `npx skills` otherwise resolves
whatever npm considers current at sync time.

## Lock-file recommendation

There is enough information to implement a reproducible Skillset lock file,
provided Skillset resolves Git dependencies itself before delegating install:

1. Keep `skillset.yaml` declarative: source, requested skill names, target
   agent identifiers, scope, and copy preference.
2. Resolve each Git source/ref to an immutable commit SHA, record canonical
   clone URL, requested ref, resolved commit, selected skill path/name, and a
   content hash of the selected skill directory in a Skillset-owned lock file.
3. During sync, fetch/verify the locked commit and content hash, then call
   `npx skills add` with a source URL pinned to that commit plus the declared
   `--skill`, `--agent`, `--yes`, and optional `--copy` flags.
4. For local sources, lock a normalized relative path and content hash; fail
   sync if it is absent or its hash differs. Do not claim reproducibility for
   absolute paths.
5. Implement `skillset update` as an explicit re-resolution step that changes
   the Skillset lock, followed by sync. It may use `npx skills update` as a
   convenience for unmanaged/global skills, but should not rely on it to alter
   Skillset-managed project state.

The current parser accepts a raw ref in a Git-like source fragment (for example,
`owner/repo#<40-character-commit-sha>`) and the clone layer has a commit-SHA
fallback. Neither behavior is documented as a compatibility guarantee. Validate
that form for each required host in a prototype, or install generic Git sources
from a verified temporary checkout. This keeps reproducibility guarantees
independent of undocumented upstream locks while leaving discovery,
installation, agent linking, and normal update mechanics to the upstream CLI.

## Sources

* [Upstream README: source formats, scopes, install methods, supported agents, and updates](https://github.com/vercel-labs/skills/blob/main/README.md)
* [Current CLI help and command dispatcher](https://github.com/vercel-labs/skills/blob/main/src/cli.ts)
* [Project lock implementation](https://github.com/vercel-labs/skills/blob/main/src/local-lock.ts)
* [Global lock implementation](https://github.com/vercel-labs/skills/blob/main/src/skill-lock.ts)
* [Update implementation](https://github.com/vercel-labs/skills/blob/main/src/update.ts)
* [Agent registry](https://github.com/vercel-labs/skills/blob/main/src/agents.ts)
* [Official CLI reference](https://www.skills.sh/docs/cli)
