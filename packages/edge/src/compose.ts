import type { ImportMap } from "@knitkit/runtime";
import { serializeImportMap } from "./serialize.js";

export interface Fragment {
  /** Matches the `name` of a `<knitkit-fragment>` placeholder in the template. */
  name: string;
  /** URL to fetch the fragment's HTML from. */
  src: string;
  /** Optional fetch init (headers, etc.). */
  init?: RequestInit;
}

export interface ComposeOptions {
  /**
   * Host HTML template. Mark insertion points with:
   *   `<knitkit-fragment name="checkout">optional fallback</knitkit-fragment>`
   * or the self-closing `<knitkit-fragment name="checkout" />`.
   */
  template: string;
  /** Fragments to fetch and inline. */
  fragments: Fragment[];
  /** Optional negotiated import map, injected before `</head>` for hydration parity. */
  importMap?: ImportMap;
  /** fetch implementation; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Produce fallback HTML when a fragment fails. Defaults to the placeholder's inner fallback. */
  onError?: (fragment: Fragment, error: Error) => string;
}

type Segment = { type: "text"; value: string } | { type: "fragment"; name: string; fallback: string };

const FRAGMENT_RE = /<knitkit-fragment\s+name="([^"]+)"\s*(?:\/>|>([\s\S]*?)<\/knitkit-fragment>)/g;

/** Split a template into ordered text and fragment segments. Exported for testing. */
export function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  FRAGMENT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FRAGMENT_RE.exec(template))) {
    if (m.index > last) segments.push({ type: "text", value: template.slice(last, m.index) });
    segments.push({ type: "fragment", name: m[1]!, fallback: m[2] ?? "" });
    last = FRAGMENT_RE.lastIndex;
  }
  if (last < template.length) segments.push({ type: "text", value: template.slice(last) });
  return segments;
}

/**
 * Compose a host template with remote fragments as a streaming HTML response.
 *
 * The head and static content flush immediately; fragments are fetched in parallel and
 * streamed in document order as each resolves. A failed fragment degrades to its inline
 * fallback (or `onError`) — the page never 500s because one remote is down.
 */
export function composeStream(options: ComposeOptions): ReadableStream<Uint8Array> {
  const fetchImpl = options.fetch ?? fetch;
  const template = options.importMap ? injectImportMap(options.template, options.importMap) : options.template;
  const segments = parseTemplate(template);
  const byName = new Map(options.fragments.map((f) => [f.name, f]));

  // Kick off all fetches up front, in parallel.
  const inflight = new Map<string, Promise<string>>();
  for (const seg of segments) {
    if (seg.type === "fragment") {
      const frag = byName.get(seg.name);
      if (frag && !inflight.has(seg.name)) inflight.set(seg.name, fetchFragment(fetchImpl, frag));
    }
  }

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const seg of segments) {
          if (seg.type === "text") {
            controller.enqueue(encoder.encode(seg.value));
            continue;
          }
          const frag = byName.get(seg.name);
          if (!frag) {
            controller.enqueue(encoder.encode(seg.fallback || `<!-- knitkit: no fragment registered for "${seg.name}" -->`));
            continue;
          }
          let html: string;
          try {
            html = (await inflight.get(seg.name))!;
          } catch (e) {
            html = options.onError
              ? options.onError(frag, e as Error)
              : seg.fallback || `<!-- knitkit: fragment "${seg.name}" failed: ${(e as Error).message} -->`;
          }
          controller.enqueue(encoder.encode(html));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

/** Compose into a `Response` (the typical edge-handler return value). */
export function composeResponse(options: ComposeOptions, init: ResponseInit = {}): Response {
  return new Response(composeStream(options), {
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });
}

/** Buffered convenience: compose to a single HTML string. */
export async function compose(options: ComposeOptions): Promise<string> {
  return new Response(composeStream(options)).text();
}

async function fetchFragment(fetchImpl: typeof fetch, frag: Fragment): Promise<string> {
  const res = await fetchImpl(frag.src, frag.init);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching fragment "${frag.name}" from ${frag.src}`);
  return res.text();
}

function injectImportMap(template: string, map: ImportMap): string {
  const tag = serializeImportMap(map);
  if (template.includes("</head>")) return template.replace("</head>", `${tag}</head>`);
  return tag + template;
}
