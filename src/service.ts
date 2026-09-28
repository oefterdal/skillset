import { access, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { isLocal, localRoot, resolveGit, withCheckout } from "./git";
import { directoryHash, normalizedRelative } from "./hash";
import { sortLock, writeLockAtomic } from "./lock";
import { installWithSkills } from "./skills";
import type { EffectiveSkill, Lock, LockEntry, Runner } from "./types";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function findSkill(root: string, name: string): Promise<string> {
  const candidates: string[] = [];
  async function walk(dir: string): Promise<void> {
    if (await exists(join(dir, "SKILL.md"))) {
      if (dir === root || dir.split(/[\\/]/).at(-1) === name)
        candidates.push(dir);
      return;
    }
    for (const item of await readdir(dir, { withFileTypes: true }))
      if (item.isDirectory()) await walk(join(dir, item.name));
  }
  await walk(root);
  const matching = candidates.filter(
    (p) => p === root || p.split(/[\\/]/).at(-1) === name,
  );
  if (matching.length !== 1)
    throw new Error(
      `expected exactly one skill directory named ${name}, found ${matching.length}`,
    );
  return matching[0];
}
export async function resolveEntry(
  skill: EffectiveSkill,
  project: string,
  runner: Runner,
): Promise<LockEntry> {
  const install = { agents: skill.agents, copy: skill.copy };
  if (isLocal(skill.source)) {
    const root = localRoot(project, skill.source);
    const selected = await findSkill(root, skill.skill);
    return {
      source: {
        kind: "local",
        declared: skill.source,
        path: normalizedRelative(project, root),
      },
      skill: {
        name: skill.skill,
        path: relative(root, selected).split("\\").join("/") || ".",
        directoryHash: await directoryHash(selected),
      },
      install,
    };
  }
  const git = await resolveGit(skill.source, skill.ref, runner);
  return await withCheckout(git.url, git.commit, runner, async (root) => {
    const selected = await findSkill(root, skill.skill);
    return {
      source: {
        kind: "git",
        declared: skill.source,
        canonicalUrl: git.url,
        requestedRef: git.ref,
        commit: git.commit,
      },
      skill: {
        name: skill.skill,
        path: relative(root, selected).split("\\").join("/") || ".",
        directoryHash: await directoryHash(selected),
      },
      install,
    };
  });
}
export async function resolveAll(
  skills: EffectiveSkill[],
  project: string,
  runner: Runner,
): Promise<Lock> {
  return sortLock(
    await Promise.all(skills.map((x) => resolveEntry(x, project, runner))),
  );
}
async function verifyAndInstall(
  entry: LockEntry,
  project: string,
  runner: Runner,
): Promise<void> {
  const verify = async (root: string) => {
    const selected = join(root, entry.skill.path);
    const hash = await directoryHash(selected);
    if (hash.value !== entry.skill.directoryHash.value)
      throw new Error(`integrity check failed for ${entry.skill.name}`);
    await installWithSkills(root, entry, runner, project);
  };
  if (entry.source.kind === "local")
    await verify(join(project, entry.source.path));
  else
    await withCheckout(
      entry.source.canonicalUrl,
      entry.source.commit,
      runner,
      verify,
    );
}
export async function installLock(
  lock: Lock,
  project: string,
  runner: Runner,
): Promise<void> {
  for (const entry of lock.skills)
    await verifyAndInstall(entry, project, runner);
}
export function assertLockMatches(lock: Lock, skills: EffectiveSkill[]): void {
  if (lock.skills.length !== skills.length)
    throw new Error(
      "skillset.lock does not match skillset.yaml; run skillset update",
    );
  for (const skill of skills) {
    const found = lock.skills.find(
      (entry) =>
        entry.source.declared === skill.source &&
        entry.skill.name === skill.skill,
    );
    if (
      !found ||
      found.install.copy !== skill.copy ||
      JSON.stringify(found.install.agents) !== JSON.stringify(skill.agents)
    )
      throw new Error(
        "skillset.lock does not match skillset.yaml; run skillset update",
      );
    if (
      found.source.kind === "git" &&
      found.source.requestedRef !== (skill.ref ?? "HEAD")
    )
      throw new Error(
        "skillset.lock does not match skillset.yaml; run skillset update",
      );
  }
}
export async function updateLock(
  skills: EffectiveSkill[],
  project: string,
  lockPath: string,
  runner: Runner,
): Promise<Lock> {
  const candidate = await resolveAll(skills, project, runner);
  await installLock(candidate, project, runner);
  await writeLockAtomic(lockPath, candidate);
  return candidate;
}
export async function commitLock(
  project: string,
  push: boolean,
  runner: Runner,
): Promise<void> {
  const staged = await runner(
    ["git", "add", "--", "skillset.lock", "skillset.yaml"],
    project,
  );
  if (staged.exitCode)
    throw new Error(`unable to stage Skillset state: ${staged.stderr.trim()}`);
  const commit = await runner(
    [
      "git",
      "commit",
      "-m",
      "chore: update Skillset lock",
      "--",
      "skillset.lock",
      "skillset.yaml",
    ],
    project,
  );
  if (commit.exitCode)
    throw new Error(
      `lock installed but Git commit failed: ${commit.stderr.trim() || commit.stdout.trim()}`,
    );
  if (push) {
    const result = await runner(["git", "push"], project);
    if (result.exitCode)
      throw new Error(
        `lock committed but push failed; retry git push: ${result.stderr.trim()}`,
      );
  }
}
