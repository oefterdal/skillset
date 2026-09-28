import { createHash } from "node:crypto";
import {
  access,
  chmod,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPOSITORY = "oefterdal/skillset";
export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function platformAsset(
  platform = process.platform,
  architecture = process.arch,
): string {
  const os =
    platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : "";
  const arch =
    architecture === "x64" ? "x64" : architecture === "arm64" ? "arm64" : "";
  if (!os || !arch)
    throw new Error(`unsupported platform: ${platform}-${architecture}`);
  return `skillset-${os}-${arch}`;
}
export function version(value: string): number[] {
  const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`unsupported release version: ${value}`);
  return match.slice(1).map(Number);
}
export function compareVersions(a: string, b: string): number {
  const aa = version(a),
    bb = version(b);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}
export async function latestRelease(
  fetcher: Fetcher = fetch,
): Promise<{ tag: string; assets: Map<string, string> }> {
  const response = await fetcher(
    `https://api.github.com/repos/${REPOSITORY}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!response.ok)
    throw new Error(`could not query latest release (HTTP ${response.status})`);
  const data = (await response.json()) as {
    tag_name?: unknown;
    assets?: { name?: unknown; browser_download_url?: unknown }[];
  };
  if (typeof data.tag_name !== "string" || !Array.isArray(data.assets))
    throw new Error("malformed release metadata");
  version(data.tag_name);
  const assets = new Map<string, string>();
  for (const asset of data.assets)
    if (
      typeof asset.name === "string" &&
      typeof asset.browser_download_url === "string"
    )
      assets.set(asset.name, asset.browser_download_url);
  return { tag: data.tag_name, assets };
}
async function download(url: string, fetcher: Fetcher): Promise<Uint8Array> {
  const r = await fetcher(url);
  if (!r.ok) throw new Error(`download failed (HTTP ${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}
export async function selfUpdate(
  current: string,
  executable: string,
  fetcher: Fetcher = fetch,
): Promise<"current" | string> {
  const release = await latestRelease(fetcher);
  if (compareVersions(release.tag, current) <= 0) return "current";
  const asset = platformAsset(),
    binaryUrl = release.assets.get(asset),
    checksumUrl = release.assets.get(`${asset}.sha256`);
  if (!binaryUrl || !checksumUrl)
    throw new Error(`latest release is missing assets for ${asset}`);
  const directory = await mkdtemp(join(tmpdir(), "skillset-update-"));
  try {
    const [binary, checksum] = await Promise.all([
      download(binaryUrl, fetcher),
      download(checksumUrl, fetcher),
    ]);
    const expected = new TextDecoder().decode(checksum).trim().split(/\s+/)[0];
    const actual = createHash("sha256").update(binary).digest("hex");
    if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual)
      throw new Error(
        "checksum verification failed; existing Skillset installation was not modified",
      );
    const target = await realpath(executable);
    await access(target);
    const staged = join(dirname(target), `.skillset-${process.pid}.new`);
    await writeFile(staged, binary, { mode: 0o755 });
    await chmod(staged, 0o755);
    await rename(staged, target);
    return release.tag;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
