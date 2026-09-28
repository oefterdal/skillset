import { mustRun } from "./run";
import type { LockEntry, Runner } from "./types";
export const SKILLS_VERSION = "1.7.0";
export function skillsArgs(source: string, entry: LockEntry): string[] {
  return [
    "npx",
    "--yes",
    `skills@${SKILLS_VERSION}`,
    "add",
    source,
    "--skill",
    entry.skill.name,
    "--agent",
    ...entry.install.agents,
    "--yes",
    ...(entry.install.copy ? ["--copy"] : []),
  ];
}
export async function installWithSkills(
  source: string,
  entry: LockEntry,
  runner: Runner,
  cwd: string,
): Promise<void> {
  await mustRun(runner, skillsArgs(source, entry), cwd);
}
