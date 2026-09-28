export type ManifestSkill = {
  source: string;
  ref?: string;
  skill: string;
  agents?: string[];
  copy?: boolean;
};
export type Manifest = {
  version: 1;
  defaults?: { agents?: string[]; copy?: boolean };
  update?: { commit?: boolean; push?: boolean };
  skills: ManifestSkill[];
};
export type EffectiveSkill = Required<
  Pick<ManifestSkill, "source" | "skill">
> & { ref?: string; agents: string[]; copy: boolean };
export type Hash = { algorithm: "sha256"; value: string };
export type GitSource = {
  kind: "git";
  declared: string;
  canonicalUrl: string;
  requestedRef: string;
  commit: string;
};
export type LocalSource = { kind: "local"; declared: string; path: string };
export type LockEntry = {
  source: GitSource | LocalSource;
  skill: { name: string; path: string; directoryHash: Hash };
  install: { agents: string[]; copy: boolean };
};
export type Lock = { version: 1; skills: LockEntry[] };
export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};
export type Runner = (cmd: string[], cwd?: string) => Promise<CommandResult>;
