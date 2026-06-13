import { satisfies } from "./semver.js";
import { FedkitError } from "./errors.js";
import type { ImportMap, Manifest, SharedDecl } from "./manifest.js";

export interface NegotiationResult {
  /** Map of package name -> winning version -> winning URL. */
  winners: Record<string, { version: string; url: string; integrity?: string; source: string }>;
  /** Per-package fallback entries: when a participant's range is incompatible with the winner. */
  scopes: Record<string, Record<string, string>>;
  /** Import-map payload ready to inject. */
  importMap: ImportMap;
  /** Human-readable resolution report (for `getShareInfo`). */
  report: ResolutionReport;
}

export interface ResolutionReport {
  packages: Record<string, PackageReport>;
}

export interface PackageReport {
  winner: { version: string; url: string; source: string };
  fallbacks: Array<{ from: string; range: string; version: string; url: string }>;
  conflict: boolean;
}

export interface HostSharedDecl extends SharedDecl {
  /** The package name as the host references it (used in the merged import map). */
  importAs?: string;
}

export interface RemoteInput {
  name: string;
  manifest: Manifest;
  /** Resolves relative manifest URLs to absolute URLs. */
  baseUrl: string;
  /** Optional: which package name this remote uses for itself (e.g. "react"). */
}

interface ParticipantShare {
  from: string;
  pkg: string;
  range: string;
  version: string;
  url: string;
  integrity?: string;
  singleton: boolean;
}

export function negotiateShared(
  manifests: Array<{ name: string; manifest: Manifest; baseUrl: string }>,
  hostShared: Record<string, HostSharedDecl> = {},
  hostBaseUrl = "",
): NegotiationResult {
  const participants: ParticipantShare[] = [];

  for (const [pkg, decl] of Object.entries(hostShared)) {
    const importAs = decl.importAs ?? pkg;
    if (!decl.url) {
      throw new FedkitError(
        "KNIT_ERR_MANIFEST_INVALID",
        `Host shared "${pkg}" is missing a "url".`,
        `The host must provide a url for every shared dep, or omit it.`,
      );
    }
    participants.push({
      from: "host",
      pkg: importAs,
      range: decl.requiredVersion,
      version: decl.version,
      url: resolveUrl(hostBaseUrl, decl.url),
      integrity: decl.integrity,
      singleton: decl.singleton !== false,
    });
  }

  for (const { name, manifest, baseUrl } of manifests) {
    for (const [pkg, decl] of Object.entries(manifest.shared)) {
      const importAs = pkg;
      if (!decl.url) {
        throw new FedkitError(
          "KNIT_ERR_MANIFEST_INVALID",
          `Remote "${name}" shared "${pkg}" is missing a "url".`,
          `Every shared entry must declare a url pointing to the emitted ESM asset.`,
        );
      }
      participants.push({
        from: name,
        pkg: importAs,
        range: decl.requiredVersion,
        version: decl.version,
        url: resolveUrl(baseUrl, decl.url),
        integrity: decl.integrity,
        singleton: decl.singleton !== false,
      });
    }
  }

  const byPkg = new Map<string, ParticipantShare[]>();
  for (const p of participants) {
    const arr = byPkg.get(p.pkg) ?? [];
    arr.push(p);
    byPkg.set(p.pkg, arr);
  }

  const winners: NegotiationResult["winners"] = {};
  const scopes: NegotiationResult["scopes"] = {};
  const report: ResolutionReport = { packages: {} };

  for (const [pkg, entries] of byPkg) {
    const versions = entries.map((e) => e.version);

    // First, find the version that satisfies every participant's range.
    const candidate = pickVersionSatisfyingAll(entries, versions);

    if (candidate) {
      const winnerEntry = entries.find((e) => e.version === candidate && e.singleton) ?? entries.find((e) => e.version === candidate)!;
      winners[pkg] = {
        version: candidate,
        url: winnerEntry.url,
        integrity: winnerEntry.integrity,
        source: winnerEntry.from,
      };
      const fallbacks: PackageReport["fallbacks"] = [];
      for (const e of entries) {
        if (e.version !== candidate && !satisfies(candidate, e.range)) {
          // Outlier: must fall back via scopes to its own copy.
          const scopeKey = resolveUrlScope(entries, e.from);
          (scopes[scopeKey] ??= {})[pkg] = e.url;
          fallbacks.push({ from: e.from, range: e.range, version: e.version, url: e.url });
        }
      }
      report.packages[pkg] = {
        winner: { version: candidate, url: winnerEntry.url, source: winnerEntry.from },
        fallbacks,
        conflict: fallbacks.length > 0,
      };
      continue;
    }

    // No version satisfies all ranges.
    const singletons = entries.filter((e) => e.singleton);
    if (singletons.length > 0) {
      throw new FedkitError(
        "KNIT_ERR_SINGLETON_CONFLICT",
        buildSingletonConflictMessage(pkg, entries),
        buildSingletonConflictSuggestion(pkg, entries),
      );
    }

    // Non-singleton: pick the entry whose range the most participants' versions satisfy
    // (the majority), breaking ties by the higher version.
    const popularity = (range: string) => entries.filter((e) => satisfies(e.version, range)).length;
    const sortedByRange = [...entries].sort(
      (a, b) => popularity(b.range) - popularity(a.range) || compareVersionStrings(b.version, a.version),
    );
    const winnerEntry = sortedByRange[0]!;
    winners[pkg] = {
      version: winnerEntry.version,
      url: winnerEntry.url,
      integrity: winnerEntry.integrity,
      source: winnerEntry.from,
    };
    const fallbacks: PackageReport["fallbacks"] = [];
    for (const e of entries) {
      // Only the outliers the winner can't satisfy need their own copy via scopes; a
      // participant already compatible with the winner shares it (no redundant dual-load).
      if (e === winnerEntry || satisfies(winnerEntry.version, e.range)) continue;
      const scopeKey = resolveUrlScope(entries, e.from);
      (scopes[scopeKey] ??= {})[pkg] = e.url;
      fallbacks.push({ from: e.from, range: e.range, version: e.version, url: e.url });
    }
    report.packages[pkg] = {
      winner: { version: winnerEntry.version, url: winnerEntry.url, source: winnerEntry.from },
      fallbacks,
      conflict: fallbacks.length > 0,
    };
  }

  const imports: Record<string, string> = {};
  const integrity: Record<string, string> = {};
  for (const [pkg, w] of Object.entries(winners)) {
    imports[pkg] = w.url;
    if (w.integrity) integrity[pkg] = w.integrity;
  }

  return {
    winners,
    scopes,
    importMap: {
      imports,
      scopes: Object.keys(scopes).length > 0 ? scopes : undefined,
      integrity: Object.keys(integrity).length > 0 ? integrity : undefined,
    },
    report,
  };
}

function pickVersionSatisfyingAll(entries: ParticipantShare[], versions: string[]): string | undefined {
  const unique = Array.from(new Set(versions));
  // Sort descending; try each until we find one satisfying every range.
  unique.sort((a, b) => -compareVersionStrings(a, b));
  for (const v of unique) {
    if (entries.every((e) => satisfies(v, e.range))) return v;
  }
  return undefined;
}

function compareVersionStrings(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function resolveUrlScope(entries: ParticipantShare[], from: string): string {
  const e = entries.find((x) => x.from === from);
  if (!e) return from;
  try {
    const u = new URL(e.url);
    return u.origin + u.pathname.replace(/[^/]+$/, "");
  } catch {
    return from;
  }
}

function resolveUrl(base: string, ref: string): string {
  if (!base) return ref;
  try {
    return new URL(ref, base).toString();
  } catch {
    return ref;
  }
}

function buildSingletonConflictMessage(pkg: string, entries: ParticipantShare[]): string {
  const lines = entries.map((e) => `  - ${e.from}: ${e.version} (requires ${e.range})`);
  return [
    `Singleton conflict for "${pkg}": no version satisfies every participant's requiredVersion.`,
    `Participants:`,
    ...lines,
  ].join("\n");
}

function buildSingletonConflictSuggestion(pkg: string, entries: ParticipantShare[]): string {
  const versions = Array.from(new Set(entries.map((e) => e.version)));
  return [
    `Options:`,
    `  1) Align all participants to a single version (preferred for singletons).`,
    `  2) Loosen a requiredVersion to allow one of: ${versions.join(", ")}.`,
    `  3) Remove "singleton: true" for "${pkg}" if dual-loading is acceptable.`,
  ].join("\n");
}
