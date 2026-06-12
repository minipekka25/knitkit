export { registerRemotes, getLastResult } from "./registerRemotes.js";
export type { RegisterRemotesInput, RegisterRemotesOptions } from "./registerRemotes.js";

export { loadRemote } from "./loadRemote.js";
export type { RemoteModules } from "./loadRemote.js";

export { negotiateShared } from "./negotiate.js";
export type { NegotiationResult, ResolutionReport, PackageReport, HostSharedDecl } from "./negotiate.js";

export { injectImportMap } from "./injectImportMap.js";

export { getShareInfo } from "./getShareInfo.js";

export { validateManifest } from "./manifest.js";
export type { Manifest, ExposeDecl, SharedDecl, ImportMap } from "./manifest.js";

export { FedkitError, isFedkitError } from "./errors.js";
export type { FedkitErrorCode } from "./errors.js";
