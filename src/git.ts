import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { mustRun } from "./run";
import type { Runner } from "./types";

export function isLocal(source: string): boolean {
  return source.startsWith(".") || isAbsolute(source);
}
export function canonicalGitUrl(source: string): string {
  if (/^[\w.-]+\/[\w.-]+$/.test(source))
    return `https://github.com/${source}.git`;
  return source;
}
export async function resolveGit(
  source: string,
  ref: string | undefined,
  runner: Runner,
): Promise<{ url: string; ref: string; commit: string }> {
  const url = canonicalGitUrl(source);
  const wanted = ref ?? "HEAD";
  const commit = await mustRun(runner, ["git", "ls-remote", url, wanted]);
  const sha = commit.split(/\s+/)[0];
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new Error(`unable to resolve ${source}@${wanted}`);
  return { url, ref: wanted, commit: sha };
}
export async function withCheckout<T>(
  url: string,
  commit: string,
  runner: Runner,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "skillset-"));
  try {
    await mustRun(runner, ["git", "clone", "--no-checkout", url, dir]);
    await mustRun(runner, [
      "git",
      "-C",
      dir,
      "fetch",
      "--depth=1",
      "origin",
      commit,
    ]);
    const type = await mustRun(runner, [
      "git",
      "-C",
      dir,
      "cat-file",
      "-t",
      commit,
    ]);
    if (type !== "commit") throw new Error("locked object is not a commit");
    await mustRun(runner, ["git", "-C", dir, "checkout", "--detach", commit]);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export function localRoot(project: string, source: string): string {
  if (isAbsolute(source))
    throw new Error(`absolute local source is non-portable: ${source}`);
  const path = resolve(project, source);
  if (!path.startsWith(`${resolve(project)}/`))
    throw new Error("local source escapes project directory");
  return path;
}
