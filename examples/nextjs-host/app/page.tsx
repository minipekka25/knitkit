import { RemoteFragment } from "@knitkit/react";

// A server component. <RemoteFragment> is a "use client" component from @knitkit/react, so
// importing it here creates a client boundary automatically — no next.config changes needed.
// Note: a server component may pass serializable (ReactNode) props across that boundary, but
// not functions, so fallback/errorFallback are static nodes here.
export default function Page() {
  const src = process.env.NEXT_PUBLIC_FRAGMENT_URL ?? "http://localhost:5304/";
  return (
    <main>
      <h1>Next.js App Router + knitkit</h1>
      <p>
        The card below is a <strong>remote fragment</strong> — its own independent app, embedded with{" "}
        <code>&lt;RemoteFragment&gt;</code> and <strong>zero <code>next.config</code> changes</strong>. It
        brings its own framework, so Next never has to share React with it (no &quot;invalid hook call&quot;).
      </p>
      <RemoteFragment
        src={src}
        fallback={<p>loading remote…</p>}
        errorFallback={<p style={{ color: "crimson" }}>remote unavailable — is the fragment server running on :5304?</p>}
      />
    </main>
  );
}
