export type Version = `${number}.${number}.${number}` | `${number}.${number}.${number}-${string}`;

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/;

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  pre: string | null;
  raw: string;
}

function parseVersion(input: string): ParsedVersion {
  const m = VERSION_RE.exec(input);
  if (!m) throw new Error(`Invalid semver version: "${input}"`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ?? null,
    raw: input,
  };
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // No pre-release > pre-release: a version without pre is "higher" within same x.y.z.
  if (a.pre === null && b.pre === null) return 0;
  if (a.pre === null) return 1;
  if (b.pre === null) return -1;
  if (a.pre === b.pre) return 0;
  return a.pre < b.pre ? -1 : 1;
}

type Comparator =
  | { kind: "any" }
  | { kind: "exact"; v: ParsedVersion }
  | { kind: "gte"; v: ParsedVersion }
  | { kind: "gt"; v: ParsedVersion }
  | { kind: "lte"; v: ParsedVersion }
  | { kind: "lt"; v: ParsedVersion }
  | { kind: "caret"; v: ParsedVersion; upper: ParsedVersion }
  | { kind: "tilde"; v: ParsedVersion; upper: ParsedVersion };

function parseRange(range: string): Comparator {
  const r = range.trim();
  if (r === "*" || r === "x" || r === "X") return { kind: "any" };
  if (r.startsWith(">=")) return { kind: "gte", v: parseVersion(r.slice(2)) };
  if (r.startsWith(">")) return { kind: "gt", v: parseVersion(r.slice(1)) };
  if (r.startsWith("<=")) return { kind: "lte", v: parseVersion(r.slice(2)) };
  if (r.startsWith("<")) return { kind: "lt", v: parseVersion(r.slice(1)) };
  if (r.startsWith("=")) return { kind: "exact", v: parseVersion(r.slice(1)) };

  // x-ranges: "1", "1.2", "1.x", "1.2.x" (and plain "1.2.3" handled as exact).
  const xm = /^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(r);
  if (xm) {
    const major = Number(xm[1]);
    const minorX = xm[2] === undefined || xm[2] === "x" || xm[2] === "*";
    const patchX = xm[3] === undefined || xm[3] === "x" || xm[3] === "*";
    if (minorX) {
      return {
        kind: "tilde",
        v: { major, minor: 0, patch: 0, pre: null, raw: `${major}.0.0` },
        upper: { major: major + 1, minor: 0, patch: 0, pre: null, raw: `${major + 1}.0.0` },
      };
    }
    const minor = Number(xm[2]);
    if (patchX) {
      return {
        kind: "tilde",
        v: { major, minor, patch: 0, pre: null, raw: `${major}.${minor}.0` },
        upper: { major, minor: minor + 1, patch: 0, pre: null, raw: `${major}.${minor + 1}.0` },
      };
    }
    const patch = Number(xm[3]);
    return { kind: "exact", v: { major, minor, patch, pre: null, raw: r } };
  }

  if (r.startsWith("~")) {
    const v = parseVersion(r.slice(1));
    return { kind: "tilde", v, upper: { ...v, minor: v.minor + 1, patch: 0, pre: null, raw: "" } };
  }

  if (r.startsWith("^")) {
    const v = parseVersion(r.slice(1));
    let upper: ParsedVersion;
    if (v.major > 0) {
      upper = { major: v.major + 1, minor: 0, patch: 0, pre: null, raw: "" };
    } else if (v.minor > 0) {
      upper = { major: 0, minor: v.minor + 1, patch: 0, pre: null, raw: "" };
    } else {
      // ^0.0.x -> exact pin
      upper = { major: 0, minor: 0, patch: v.patch + 1, pre: null, raw: "" };
    }
    return { kind: "caret", v, upper };
  }

  // Default: exact
  return { kind: "exact", v: parseVersion(r) };
}

function comparatorSatisfies(c: Comparator, v: ParsedVersion): boolean {
  switch (c.kind) {
    case "any":
      return true;
    case "exact":
      return compareVersions(v, c.v) === 0;
    case "gte":
      return compareVersions(v, c.v) >= 0;
    case "gt":
      return compareVersions(v, c.v) > 0;
    case "lte":
      return compareVersions(v, c.v) <= 0;
    case "lt":
      return compareVersions(v, c.v) < 0;
    case "caret":
      return compareVersions(v, c.v) >= 0 && compareVersions(v, c.upper) < 0;
    case "tilde":
      return compareVersions(v, c.v) >= 0 && compareVersions(v, c.upper) < 0;
  }
}

export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  const c = parseRange(range);
  return comparatorSatisfies(c, v);
}

/** True if `v` is a valid `x.y.z[-pre]` version string. */
export function isValidVersion(v: string): boolean {
  return VERSION_RE.test(v);
}

/** True if `range` is a range this matcher can parse (caret/tilde/exact/x-range/comparators). */
export function isValidRange(range: string): boolean {
  try {
    parseRange(range);
    return true;
  } catch {
    return false;
  }
}

export function maxSatisfying(versions: readonly Version[], range: string): Version | undefined {
  const c = parseRange(range);
  let best: ParsedVersion | undefined;
  for (const raw of versions) {
    const v = parseVersion(raw);
    if (!comparatorSatisfies(c, v)) continue;
    if (!best || compareVersions(v, best) > 0) best = v;
  }
  return best ? (best.raw as Version) : undefined;
}
