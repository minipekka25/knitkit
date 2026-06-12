export type FedkitErrorCode =
  | "FED_ERR_NEGOTIATION_CONFLICT"
  | "FED_ERR_SINGLETON_CONFLICT"
  | "FED_ERR_MANIFEST_INVALID"
  | "FED_ERR_LOAD_FAILED"
  | "FED_ERR_NOT_REGISTERED"
  | "FED_ERR_IMPORT_MAP_INJECTION_FAILED";

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
