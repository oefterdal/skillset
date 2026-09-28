import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { parse } from "yaml";
import type { EffectiveSkill, Manifest } from "./types";

const stringList = (value: unknown, name: string): string[] | undefined => {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((x) => typeof x !== "string" || !x.trim())
  )
    throw new Error(`${name} must be a list of nonempty strings`);
  return value;
};
export function parseManifest(text: string): Manifest {
  const doc = parse(text) as Record<string, unknown>;
  if (!doc || doc.version !== 1 || !Array.isArray(doc.skills))
    throw new Error("skillset.yaml requires version: 1 and skills");
  const defaults = doc.defaults as Record<string, unknown> | undefined;
  const update = doc.update as Record<string, unknown> | undefined;
  const manifest: Manifest = {
    version: 1,
    defaults: defaults
      ? {
          agents: stringList(defaults.agents, "defaults.agents"),
          copy: defaults.copy as boolean | undefined,
        }
      : undefined,
    update: update
      ? {
          commit: update.commit as boolean | undefined,
          push: update.push as boolean | undefined,
        }
      : undefined,
    skills: [],
  };
  if (
    manifest.defaults?.copy !== undefined &&
    typeof manifest.defaults.copy !== "boolean"
  )
    throw new Error("defaults.copy must be boolean");
  if (manifest.update) {
    if (
      (manifest.update.commit !== undefined &&
        typeof manifest.update.commit !== "boolean") ||
      (manifest.update.push !== undefined &&
        typeof manifest.update.push !== "boolean")
    )
      throw new Error("update settings must be booleans");
    if (manifest.update.push && !manifest.update.commit)
      throw new Error("update.push requires update.commit: true");
  }
  for (const raw of doc.skills as unknown[]) {
    const s = raw as Record<string, unknown>;
    if (
      !s ||
      typeof s.source !== "string" ||
      !s.source ||
      typeof s.skill !== "string" ||
      !s.skill
    )
      throw new Error("each skill requires source and skill");
    if (s.ref !== undefined && typeof s.ref !== "string")
      throw new Error("ref must be a string");
    if (s.copy !== undefined && typeof s.copy !== "boolean")
      throw new Error("copy must be boolean");
    const local = s.source.startsWith(".") || isAbsolute(s.source);
    if (local && s.ref !== undefined)
      throw new Error("local sources cannot set ref");
    manifest.skills.push({
      source: s.source,
      skill: s.skill,
      ref: s.ref as string | undefined,
      agents: stringList(s.agents, "skill agents"),
      copy: s.copy as boolean | undefined,
    });
  }
  return manifest;
}
export async function loadManifest(path: string): Promise<Manifest> {
  return parseManifest(await readFile(path, "utf8"));
}
export function effectiveSkills(manifest: Manifest): EffectiveSkill[] {
  return manifest.skills.map((s) => {
    const agents = s.agents ?? manifest.defaults?.agents;
    if (!agents?.length)
      throw new Error(`skill ${s.skill} has no effective agents`);
    return {
      source: s.source,
      skill: s.skill,
      ref: s.ref,
      agents,
      copy: s.copy ?? manifest.defaults?.copy ?? false,
    };
  });
}
