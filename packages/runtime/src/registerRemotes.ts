import { KnitError } from "./errors.js";
import { validateManifest, type Manifest } from "./manifest.js";
import { negotiateShared, type NegotiationResult, type HostSharedDecl } from "./negotiate.js";
import { injectImportMap } from "./injectImportMap.js";
import { setRegistrations, type RemoteRegistration } from "./loadRemote.js";
import { setShareInfo } from "./getShareInfo.js";

export interface RegisterRemotesInput {
  name: string;
  manifest: string | Manifest;
}

export interface RegisterRemotesOptions {
  /** Optional: shared dependencies declared by the host (e.g. its own copy of react). */
  hostShared?: Record<string, HostSharedDecl>;
}

let lastResult: NegotiationResult | null = null;

async function fetchManifest(input: RegisterRemotesInput): Promise<{ name: string; manifest: Manifest; baseUrl: string }> {
  if (typeof input.manifest === "object" && input.manifest !== null) {
    const m = validateManifest(input.manifest, `inline:${input.name}`);
    return { name: input.name, manifest: m, baseUrl: "" };
  }
  const url = input.manifest;
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin" });
  } catch (e) {
    throw new KnitError(
      "KNIT_ERR_LOAD_FAILED",
      `Failed to fetch manifest for "${input.name}" at ${url}: ${(e as Error).message}`,
      `Check that the URL is reachable and CORS is configured.`,
    );
  }
  if (!res.ok) {
    throw new KnitError(
      "KNIT_ERR_LOAD_FAILED",
      `Failed to fetch manifest for "${input.name}" at ${url}: HTTP ${res.status}`,
      `Verify the manifest is served and the URL is correct.`,
    );
  }
  const raw = (await res.json()) as unknown;
  const m = validateManifest(raw, url);
  // Use the resolved response URL as the base so relative `exposes`/`shared`
  // URLs resolve against the manifest's actual location (handles relative
  // request URLs like "/federation/knit.manifest.json" in the browser).
  return { name: input.name, manifest: m, baseUrl: res.url || url };
}

export async function registerRemotes(
  remotes: RegisterRemotesInput[],
  options: RegisterRemotesOptions = {},
): Promise<NegotiationResult> {
  const fetched = await Promise.all(remotes.map(fetchManifest));
  const result = negotiateShared(fetched, options.hostShared ?? {});
  injectImportMap(result.importMap);
  setRegistrations(
    fetched.map<RemoteRegistration>((f) => ({ name: f.name, manifest: f.manifest, baseUrl: f.baseUrl })),
  );
  setShareInfo(result);
  lastResult = result;
  return result;
}

export function getLastResult(): NegotiationResult | null {
  return lastResult;
}
