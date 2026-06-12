// Child process for the SSR integration test. Registers the fedkit loader hooks with a
// negotiated import map, then imports a bare specifier that resolves to a remote HTTP
// module. Prints "OK:<value>" on success or "ERR:<code>" on failure, and sets exit code.
import { pathToFileURL } from "node:url";

const distIndex = process.env.FEDKIT_DIST;
const url = process.env.REMOTE_URL;
const integrity = process.env.REMOTE_INTEGRITY;
const specifier = process.env.REMOTE_SPECIFIER;

const { registerFederation } = await import(pathToFileURL(distIndex).href);

const importMap = {
  imports: { [specifier]: url },
  ...(integrity ? { integrity: { [specifier]: integrity } } : {}),
};
registerFederation(importMap);

try {
  const mod = await import(specifier);
  process.stdout.write("OK:" + String(mod.greeting));
  process.exit(0);
} catch (e) {
  process.stdout.write("ERR:" + (e && e.code ? e.code : (e && e.message) || "unknown"));
  process.exit(3);
}
