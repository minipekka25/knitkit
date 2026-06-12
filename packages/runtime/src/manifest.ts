import { FedkitError } from "./errors.js";
import { isValidVersion, isValidRange } from "./semver.js";

/** A federated manifest, versioned via the `spec` field. */
export interface Manifest {
  spec: "0.1";
  name: string;
  exposes: Record<string, ExposeDecl>;
  shared: Record<string, SharedDecl>;
  meta?: Record<string, unknown>;
}

export interface ExposeDecl {
  url: string;
  types?: string;
}

export interface SharedDecl {
  version: string;
  requiredVersion: string;
  singleton?: boolean;
  url?: string;
  integrity?: string;
}

export interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
  integrity?: Record<string, string>;
}

const VALID_SPEC = "0.1";
const NAME_RE = /^[a-z][a-z0-9_-]*$/;

export function validateManifest(input: unknown, sourceLabel: string): Manifest {
  if (!input || typeof input !== "object") {
    throw new FedkitError(
      "FED_ERR_MANIFEST_INVALID",
      `Manifest at ${sourceLabel} is not an object.`,
      "Ensure the manifest is valid JSON with the expected top-level fields.",
    );
  }
  const m = input as Record<string, unknown>;

  if (m.spec !== VALID_SPEC) {
    throw new FedkitError(
      "FED_ERR_MANIFEST_INVALID",
      `Manifest at ${sourceLabel} has spec "${String(m.spec)}"; expected "${VALID_SPEC}".`,
      `Update the manifest's "spec" field to "${VALID_SPEC}".`,
    );
  }
  if (typeof m.name !== "string" || !NAME_RE.test(m.name)) {
    throw new FedkitError(
      "FED_ERR_MANIFEST_INVALID",
      `Manifest at ${sourceLabel} has invalid name "${String(m.name)}".`,
      `Names must match ${NAME_RE.source}.`,
    );
  }
  if (!m.exposes || typeof m.exposes !== "object") {
    throw new FedkitError(
      "FED_ERR_MANIFEST_INVALID",
      `Manifest at ${sourceLabel} is missing "exposes".`,
      `Add an "exposes" object, e.g. { "./Foo": { url: "./Foo.js" } }.`,
    );
  }
  if (!m.shared || typeof m.shared !== "object") {
    throw new FedkitError(
      "FED_ERR_MANIFEST_INVALID",
      `Manifest at ${sourceLabel} is missing "shared".`,
      `Add a "shared" object, e.g. { "react": { version: "18.3.1", requiredVersion: "^18.2.0" } }.`,
    );
  }

  const exposes: Record<string, ExposeDecl> = {};
  for (const [k, v] of Object.entries(m.exposes as Record<string, unknown>)) {
    if (!v || typeof v !== "object" || typeof (v as ExposeDecl).url !== "string") {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} has invalid expose entry "${k}".`,
        `Each expose must be { url: string, types?: string }.`,
      );
    }
    const e = v as ExposeDecl;
    exposes[k] = { url: e.url, types: e.types };
  }

  const shared: Record<string, SharedDecl> = {};
  for (const [k, v] of Object.entries(m.shared as Record<string, unknown>)) {
    if (!v || typeof v !== "object") {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} has invalid shared entry "${k}".`,
        `Each shared entry must include version, requiredVersion, and optional singleton/url/integrity.`,
      );
    }
    const s = v as SharedDecl;
    if (typeof s.version !== "string" || typeof s.requiredVersion !== "string") {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} shared["${k}"] missing version or requiredVersion.`,
        `Provide both version (exact) and requiredVersion (semver range).`,
      );
    }
    if (!isValidVersion(s.version)) {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} shared["${k}"].version "${s.version}" is not a valid version.`,
        `Use an exact "x.y.z" version (the installed version of the package).`,
      );
    }
    if (!isValidRange(s.requiredVersion)) {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} shared["${k}"].requiredVersion "${s.requiredVersion}" is not a supported range.`,
        `Supported: exact, ^, ~, x-ranges, and >=/>/<=/< comparators.`,
      );
    }
    if (s.url !== undefined && typeof s.url !== "string") {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} shared["${k}"].url must be a string when present.`,
        `Point url at the emitted ESM asset, e.g. "./shared/react-18.3.1.js".`,
      );
    }
    if (s.singleton !== undefined && typeof s.singleton !== "boolean") {
      throw new FedkitError(
        "FED_ERR_MANIFEST_INVALID",
        `Manifest at ${sourceLabel} shared["${k}"].singleton must be a boolean when present.`,
        `Omit it (defaults to true) or set true/false.`,
      );
    }
    shared[k] = {
      version: s.version,
      requiredVersion: s.requiredVersion,
      singleton: s.singleton,
      url: s.url,
      integrity: s.integrity,
    };
  }

  return {
    spec: VALID_SPEC,
    name: m.name,
    exposes,
    shared,
    meta: (m.meta as Record<string, unknown> | undefined) ?? undefined,
  };
}
