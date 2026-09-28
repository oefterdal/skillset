export const KNOWN_AGENTS_VERSION = 1;
export const KNOWN_AGENTS = [
  "claude-code",
  "codex",
  "cursor",
  "github-copilot",
  "windsurf",
] as const;
export async function chooseAgents(
  defaults: string[],
  yes: boolean,
): Promise<string[]> {
  if (yes) {
    if (!defaults.length) throw new Error("--yes requires configured agents");
    return defaults;
  }
  const answer = prompt(
    `Agents (${KNOWN_AGENTS.join(", ")}; comma-separated, defaults: ${defaults.join(", ")}):`,
    defaults.join(","),
  );
  const agents = (answer ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!agents.length) throw new Error("at least one agent is required");
  return agents;
}
