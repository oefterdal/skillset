import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directoryHash } from "../src/hash";
import { parseLock, sortLock, writeLockAtomic } from "../src/lock";
import { effectiveSkills, parseManifest } from "../src/manifest";
import { run } from "../src/run";
import {
  assertLockMatches,
  commitLock,
  resolveEntry,
  updateLock,
} from "../src/service";
import { SKILLS_VERSION, skillsArgs } from "../src/skills";
import type { LockEntry, Runner } from "../src/types";

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), "skillset-test-"));
}
async function skill(
  root: string,
  name: string,
  body = "# Skill\n",
): Promise<string> {
  const path = join(root, name);
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "SKILL.md"), body);
  return path;
}
const entry: LockEntry = {
  source: { kind: "local", declared: "./x", path: "x" },
  skill: {
    name: "x",
    path: ".",
    directoryHash: { algorithm: "sha256", value: "a".repeat(64) },
  },
  install: { agents: ["custom-agent"], copy: false },
};

describe("manifest and lock", () => {
  test("applies defaults and rejects missing agents", () => {
    const m = parseManifest(
      "version: 1\ndefaults:\n  agents: [codex]\nskills:\n  - source: owner/repo\n    ref: main\n    skill: demo\n",
    );
    expect(effectiveSkills(m)[0]).toMatchObject({
      agents: ["codex"],
      copy: false,
    });
    expect(() =>
      effectiveSkills(
        parseManifest(
          "version: 1\nskills:\n  - source: owner/repo\n    skill: demo\n",
        ),
      ),
    ).toThrow("effective agents");
  });
  test("rejects invalid source combinations and validates lock", () => {
    expect(() =>
      parseManifest(
        "version: 1\nskills:\n  - source: ./local\n    ref: main\n    skill: x\n",
      ),
    ).toThrow("local sources");
    expect(parseLock(JSON.stringify(sortLock([entry]))).skills).toHaveLength(1);
    expect(() => parseLock('{"version":2}')).toThrow();
  });
  test("upstream invocation is pinned and keeps unknown agents", () => {
    const args = skillsArgs("/tmp/source", entry);
    expect(SKILLS_VERSION).toBe("1.7.0");
    expect(args).toEqual([
      "npx",
      "--yes",
      "skills@1.7.0",
      "add",
      "/tmp/source",
      "--skill",
      "x",
      "--agent",
      "custom-agent",
      "--yes",
    ]);
  });
  test("rejects a lock that no longer matches its manifest", () => {
    expect(() =>
      assertLockMatches(sortLock([entry]), [
        { source: "./x", skill: "x", agents: ["other"], copy: false },
      ]),
    ).toThrow("does not match");
  });
});

describe("directory hashing", () => {
  test("is stable, reacts to bytes, and rejects symlinks", async () => {
    const root = await project();
    await skill(root, "demo", "one");
    const first = await directoryHash(join(root, "demo"));
    expect((await directoryHash(join(root, "demo"))).value).toBe(first.value);
    await writeFile(join(root, "demo", "SKILL.md"), "two");
    expect((await directoryHash(join(root, "demo"))).value).not.toBe(
      first.value,
    );
    await symlink(join(root, "demo", "SKILL.md"), join(root, "demo", "link"));
    await expect(directoryHash(join(root, "demo"))).rejects.toThrow(
      "unsupported",
    );
  });
});

describe("source resolution and updates", () => {
  test("resolves an immutable commit from a real Git repository", async () => {
    const root = await project();
    await skill(root, "demo");
    await run(["git", "init"], root);
    await run(["git", "add", "."], root);
    await run(
      [
        "git",
        "-c",
        "user.name=test",
        "-c",
        "user.email=test@example.test",
        "commit",
        "-m",
        "initial",
      ],
      root,
    );
    const resolved = await resolveEntry(
      {
        source: `file://${root}`,
        ref: "HEAD",
        skill: "demo",
        agents: ["codex"],
        copy: false,
      },
      root,
      run,
    );
    expect(resolved.source.kind).toBe("git");
    if (resolved.source.kind === "git")
      expect(resolved.source.commit).toMatch(/^[a-f0-9]{40}$/);
  });
  test("failed later installation preserves existing lock", async () => {
    const root = await project();
    await skill(root, "one");
    await skill(root, "two");
    const old = { version: 1 as const, skills: [] };
    const lock = join(root, "skillset.lock");
    await writeLockAtomic(lock, old);
    let calls = 0;
    const fake: Runner = async (cmd) => {
      if (cmd[0] === "npx") {
        calls++;
        return { stdout: "", stderr: "failed", exitCode: calls === 2 ? 1 : 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    };
    await expect(
      updateLock(
        [
          { source: "./one", skill: "one", agents: ["codex"], copy: false },
          { source: "./two", skill: "two", agents: ["codex"], copy: false },
        ],
        root,
        lock,
        fake,
      ),
    ).rejects.toThrow("npx failed");
    expect(JSON.parse(await readFile(lock, "utf8"))).toEqual(old);
  });
  test("commits only Skillset-owned paths", async () => {
    const commands: string[][] = [];
    const fake: Runner = async (cmd) => {
      commands.push(cmd);
      return { stdout: "", stderr: "", exitCode: 0 };
    };
    await commitLock("/project", false, fake);
    expect(commands[0]).toEqual([
      "git",
      "add",
      "--",
      "skillset.lock",
      "skillset.yaml",
    ]);
    expect(commands[1]).toEqual([
      "git",
      "commit",
      "-m",
      "chore: update Skillset lock",
      "--",
      "skillset.lock",
      "skillset.yaml",
    ]);
  });
});
