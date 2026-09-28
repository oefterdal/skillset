# Skillset

Skillset pins Git skill content in `skillset.lock` and delegates placement and
agent validation to `skills@1.7.0` through `npx`. It never consumes upstream
`skills-lock.json`.

Released binaries are standalone Bun executables: Bun is not required to run
them. Node.js, npm, and npx are required for `add`, `install`, and `update`,
along with Git and source credentials where needed.

Install a release with:

```sh
curl -fsSL https://raw.githubusercontent.com/oefterdal/skillset/main/install.sh | sh
```

Use `skillset add <source> --skill <name> --agent <id> --yes` to add and
install a managed skill, `skillset install` to restore the lock, and `skillset
update` to resolve configured refs and replace the lock after successful
installation. The interactive agent list is only a convenience; `npx skills`
validates all final agent IDs.
