import type { NegotiationResult, ResolutionReport } from "./negotiate.js";

let lastResult: NegotiationResult | null = null;

export function setShareInfo(result: NegotiationResult): void {
  lastResult = result;
}

export function getShareInfo(): ResolutionReport {
  if (!lastResult) {
    return { packages: {} };
  }
  return lastResult.report;
}
