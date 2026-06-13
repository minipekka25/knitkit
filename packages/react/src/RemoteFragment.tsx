import { useEffect, useState, createElement, type ReactNode } from "react";

export interface RemoteFragmentProps {
  /** URL of a remote fragment that returns HTML (its own framework, rendered independently). */
  src: string;
  /** Shown while the fragment loads. */
  fallback?: ReactNode;
  /** Shown if the fragment fails to load. A function receives the error. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Container element tag. Default "div". */
  as?: keyof JSX.IntrinsicElements;
  /** fetch init (headers, credentials, signal). */
  init?: RequestInit;
}

type State =
  | { status: "loading" }
  | { status: "ready"; html: string }
  | { status: "error"; error: Error };

/**
 * Tier-2 fragment composition (the "boundary component" path): embed a remote fragment's
 * rendered HTML into a React host **without sharing React**. Each app keeps its own
 * framework/bundler — there is no "invalid hook call" risk because nothing is shared.
 *
 * This embeds static HTML, so `<script>` tags in the fragment do NOT execute. For an
 * interactive fragment, have it ship its own bootstrap or use an iframe. For edge-side
 * stream stitching, see `@knitkit/edge`.
 */
export function RemoteFragment({ src, fallback = null, errorFallback = null, as = "div", init }: RemoteFragmentProps) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(src, init)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load fragment ${src}: HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (!cancelled) setState({ status: "ready", html });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [src, init]);

  if (state.status === "ready") {
    return createElement(as, {
      "data-testid": "remote-fragment",
      "data-status": "ready",
      dangerouslySetInnerHTML: { __html: state.html },
    });
  }
  if (state.status === "error") {
    const fb = errorFallback;
    return createElement(
      as,
      { "data-testid": "remote-fragment", "data-status": "error" },
      typeof fb === "function" ? fb(state.error) : fb,
    );
  }
  return createElement(as, { "data-testid": "remote-fragment", "data-status": "loading" }, fallback);
}
