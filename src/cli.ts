#!/usr/bin/env bun
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { chooseAgents } from "./agent";
import { loadLock } from "./lock";
import { effectiveSkills, loadManifest, parseManifest } from "./manifest";
import { run } from "./run";
import {
  assertLockMatches,
  commitLock,
  installLock,
  resolveEntry,
  updateLock,
} from "./service";

const VERSION = "0.1.0";
function manifestText(manifest: ReturnType<typeof parseManifest>): string {
  return stringify(manifest);
}
function usage(): void {
  console.log(
    `skillset ${VERSION}\n\nCommands:\n  add <source> --skill <name> [--ref <ref>] [--agent <id>...] [--copy] [--yes]\n  install\n  update\n\nSkillset resolves and verifies sources, then delegates installation to pinned npx skills.`,
  );
}
function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
}
function options(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++)
    if (args[i] === name && args[i + 1]) values.push(args[++i]);
  return values;
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("--help") || args.includes("-h"))
    return usage();
  if (args.includes("--version")) return console.log(VERSION);
  const project = process.cwd();
  const manifestPath = join(project, "skillset.yaml");
  const lockPath = join(project, "skillset.lock");
  const command = args[0];
  if (command === "add") {
    const source = args[1],
      skill = option(args, "--skill");
    if (!source || !skill)
      throw new Error("usage: skillset add <source> --skill <name>");
    const current = existsSync(manifestPath)
      ? await loadManifest(manifestPath)
      : parseManifest("version: 1\nskills: []\n");
    const explicit = options(args, "--agent");
    const agents = explicit.length
      ? explicit
      : await chooseAgents(
          current.defaults?.agents ?? [],
          args.includes("--yes"),
        );
    current.skills.push({
      source,
      skill,
      ref: option(args, "--ref"),
      agents,
      copy: args.includes("--copy"),
    });
    const resolvedSkills = effectiveSkills(current);
    const added = resolvedSkills[resolvedSkills.length - 1];
    if (!added) throw new Error("unable to create skill entry");
    const entry = await resolveEntry(added, project, run);
    const old = existsSync(lockPath)
      ? await loadLock(lockPath)
      : { version: 1 as const, skills: [] };
    old.skills.push(entry);
    await installLock({ version: 1, skills: [entry] }, project, run);
    const { writeLockAtomic, sortLock } = await import("./lock");
    writeFileSync(manifestPath, manifestText(current), "utf8");
    await writeLockAtomic(lockPath, sortLock(old.skills));
    console.log(`Added ${skill}`);
    return;
  }
  if (!existsSync(manifestPath)) throw new Error("skillset.yaml was not found");
  const manifest = await loadManifest(manifestPath);
  const skills = effectiveSkills(manifest);
  if (command === "install") {
    if (!existsSync(lockPath))
      throw new Error("skillset.lock was not found; run skillset update");
    const lock = await loadLock(lockPath);
    assertLockMatches(lock, skills);
    await installLock(lock, project, run);
    console.log("Installed locked skills");
    return;
  }
  if (command === "update") {
    await updateLock(skills, project, lockPath, run);
    if (manifest.update?.commit)
      await commitLock(project, Boolean(manifest.update.push), run);
    console.log("Updated skillset.lock");
    return;
  }
  throw new Error(`unknown command: ${command}`);
}
main().catch((error) => {
  console.error(
    `skillset: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
