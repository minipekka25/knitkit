export type KnitErrorCode =
  | "KNIT_ERR_NEGOTIATION_CONFLICT"
  | "KNIT_ERR_SINGLETON_CONFLICT"
  | "KNIT_ERR_MANIFEST_INVALID"
  | "KNIT_ERR_LOAD_FAILED"
  | "KNIT_ERR_NOT_REGISTERED"
  | "KNIT_ERR_IMPORT_MAP_INJECTION_FAILED";

export class KnitError extends Error {
  readonly code: KnitErrorCode;
  readonly suggestion?: string;

  constructor(code: KnitErrorCode, message: string, suggestion?: string) {
    super(message);
    this.name = "KnitError";
    this.code = code;
    this.suggestion = suggestion;
  }
}

export function isKnitError(e: unknown): e is KnitError {
  return e instanceof KnitError;
}

/**
 * @deprecated Renamed to {@link KnitError}. This alias will be removed in a future
 * minor release. Update imports to `KnitError`.
 */
export const FedkitError = KnitError;
/**
 * @deprecated Renamed to {@link isKnitError}. This alias will be removed in a future
 * minor release. Update imports to `isKnitError`.
 */
export const isFedkitError = isKnitError;
/**
 * @deprecated Renamed to {@link KnitErrorCode}.
 */
export type FedkitErrorCode = KnitErrorCode;
