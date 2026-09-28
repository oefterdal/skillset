import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { Hash } from "./types";

export async function directoryHash(root: string): Promise<Hash> {
  const resolved = await realpath(root);
  const hash = createHash("sha256");
  hash.update("skillset-directory-v1\n");
  async function visit(path: string, rel: string): Promise<void> {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
      throw new Error(`unsupported filesystem entry: ${rel}`);
    if (stat.isDirectory()) {
      hash.update(`D ${rel}\n`);
      for (const name of (await readdir(path)).sort()) {
        const child = join(path, name);
        const childReal = await realpath(child);
        if (
          childReal !== resolved &&
          !childReal.startsWith(`${resolved}${sep}`)
        )
          throw new Error(`path escapes skill directory: ${name}`);
        await visit(
          child,
          rel === "."
            ? name.normalize("NFC")
            : `${rel}/${name.normalize("NFC")}`,
        );
      }
    } else {
      const bytes = await readFile(path);
      hash.update(`F ${rel} ${bytes.length}\n`);
      hash.update(bytes);
      hash.update("\n");
    }
  }
  await visit(resolved, ".");
  return { algorithm: "sha256", value: hash.digest("hex") };
}

export function normalizedRelative(root: string, path: string): string {
  const value = relative(root, path).split(sep).join("/");
  if (!value || value === "." || value.split("/").includes(".."))
    throw new Error("local source must be beneath the project directory");
  return value;
}
