import type { ImportMap } from "@knitkit/runtime";
import { ModuleCache } from "./cache.js";
import { verifyIntegrity } from "./sri.js";

// Loader hooks run in a dedicated worker thread (see module.register). State here is
// per-worker and seeded by `initialize` with the negotiated import map.

interface HookData {
  importMap: ImportMap;
}

let imports: Record<string, string> = {};
let integrityByUrl: Record<string, string> = {};
const cache = new ModuleCache();

export function initialize(data: HookData): void {
  const map = data?.importMap ?? { imports: {} };
  imports = { ...map.imports };
  integrityByUrl = {};
  // Our negotiated map keys integrity by package specifier; map it onto the resolved URL
  // (and also accept URL-keyed integrity, per the import-map spec) so `load` can verify.
  for (const [spec, url] of Object.entries(imports)) {
    const integ = map.integrity?.[spec] ?? map.integrity?.[url];
    if (integ) integrityByUrl[url] = integ;
  }
}

type ResolveContext = { parentURL?: string };
type ResolveResult = { url: string; shortCircuit?: boolean; format?: string };
type NextResolve = (specifier: string, context: ResolveContext) => Promise<ResolveResult> | ResolveResult;

export async function resolve(
  specifier: string,
  context: ResolveContext,
  nextResolve: NextResolve,
): Promise<ResolveResult> {
  // 1) Bare specifier mapped by the negotiated import map → use the mapped URL.
  const mapped = imports[specifier];
  if (mapped) {
    return { url: mapped, shortCircuit: true };
  }
  // 2) Relative import inside a remote module fetched over HTTP → resolve against it,
  //    so the remote's own dependency graph loads over the network too.
  const parent = context.parentURL;
  if (parent && isHttp(parent) && (specifier.startsWith("./") || specifier.startsWith("../"))) {
    return { url: new URL(specifier, parent).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

type LoadContext = { format?: string | null };
type LoadResult = { format: string; source: string | Uint8Array; shortCircuit?: boolean };
type NextLoad = (url: string, context: LoadContext) => Promise<LoadResult> | LoadResult;

export async function load(url: string, context: LoadContext, nextLoad: NextLoad): Promise<LoadResult> {
  if (!isHttp(url)) return nextLoad(url, context);

  const cached = cache.get(url);
  if (cached) {
    return { format: cached.format, source: cached.source, shortCircuit: true };
  }

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw fedError("KNIT_ERR_LOAD_FAILED", `Failed to fetch remote module ${url}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw fedError("KNIT_ERR_LOAD_FAILED", `Failed to fetch remote module ${url}: HTTP ${res.status}`);
  }
  const source = await res.text();

  const integrity = integrityByUrl[url];
  if (integrity) {
    const check = verifyIntegrity(source, integrity);
    if (!check.ok) {
      throw fedError(
        "KNIT_ERR_SRI_MISMATCH",
        `Integrity check failed for ${url}: expected ${integrity}, got ${check.algorithm}-${check.actual}. ` +
          `The remote asset does not match its pinned hash — refusing to execute it.`,
      );
    }
  }

  cache.set(url, { source, format: "module", integrity });
  return { format: "module", source, shortCircuit: true };
}

function isHttp(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function fedError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}
