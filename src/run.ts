import type { Runner } from "./types";

export const run: Runner = async (cmd, cwd) => {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};

export async function mustRun(
  runner: Runner,
  cmd: string[],
  cwd?: string,
): Promise<string> {
  const result = await runner(cmd, cwd);
  if (result.exitCode !== 0)
    throw new Error(
      `${cmd[0]} failed: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`}`,
    );
  return result.stdout.trim();
}
