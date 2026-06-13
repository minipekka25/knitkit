export type FedkitErrorCode =
  | "KNIT_ERR_NEGOTIATION_CONFLICT"
  | "KNIT_ERR_SINGLETON_CONFLICT"
  | "KNIT_ERR_MANIFEST_INVALID"
  | "KNIT_ERR_LOAD_FAILED"
  | "KNIT_ERR_NOT_REGISTERED"
  | "KNIT_ERR_IMPORT_MAP_INJECTION_FAILED";

export class FedkitError extends Error {
  readonly code: FedkitErrorCode;
  readonly suggestion?: string;

  constructor(code: FedkitErrorCode, message: string, suggestion?: string) {
    super(message);
    this.name = "FedkitError";
    this.code = code;
    this.suggestion = suggestion;
  }
}

export function isFedkitError(e: unknown): e is FedkitError {
  return e instanceof FedkitError;
}
