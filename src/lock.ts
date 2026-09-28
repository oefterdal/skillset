import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Lock, LockEntry } from "./types";

export function sortLock(entries: LockEntry[]): Lock {
  return {
    version: 1,
    skills: [...entries].sort((a, b) =>
      `${JSON.stringify(a.source)}\0${a.skill.name}`.localeCompare(
        `${JSON.stringify(b.source)}\0${b.skill.name}`,
      ),
    ),
  };
}
export function parseLock(text: string): Lock {
  const lock = JSON.parse(text) as Lock;
  if (lock?.version !== 1 || !Array.isArray(lock.skills))
    throw new Error("invalid skillset.lock");
  for (const x of lock.skills) {
    if (
      !x?.source ||
      !x.skill?.name ||
      !x.skill.path ||
      x.skill.directoryHash?.algorithm !== "sha256" ||
      !/^[a-f0-9]{64}$/.test(x.skill.directoryHash.value) ||
      !Array.isArray(x.install?.agents)
    )
      throw new Error("invalid skillset.lock entry");
    if (
      x.source.kind === "git" &&
      (!/^[a-f0-9]{40}$/.test(x.source.commit) || !x.source.canonicalUrl)
    )
      throw new Error("invalid Git lock entry");
    if (
      x.source.kind === "local" &&
      (!x.source.path || x.source.path.split("/").includes(".."))
    )
      throw new Error("invalid local lock entry");
  }
  return lock;
}
export async function loadLock(path: string): Promise<Lock> {
  return parseLock(await readFile(path, "utf8"));
}
export async function writeLockAtomic(path: string, lock: Lock): Promise<void> {
  const tmp = join(
    dirname(path),
    `.skillset.lock.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(tmp, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}
