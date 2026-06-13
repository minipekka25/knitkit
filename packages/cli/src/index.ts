import { pathToFileURL } from "node:url";
import { buildCommand } from "./commands/build.js";
import { validateCommand } from "./commands/validate.js";
import { typesGenerateCommand } from "./commands/typesGenerate.js";
import { typesSyncCommand } from "./commands/typesSync.js";

function help(): void {
  process.stdout.write(
    [
      "knitkit — runtime-first module federation",
      "",
      "Usage:",
      "  knitkit build [cwd]            Emit dist/shared/*, dist/exposes/*, dist/knit.manifest.json",
      "  knitkit types generate [cwd]   Generate .d.ts per exposed module, patch the manifest",
      "  knitkit types sync [cwd]       Fetch remotes' types (knit.host.json), type loadRemote()",
      "  knitkit validate <manifest>    Validate a manifest against the spec",
      "  knitkit help                   Show this help",
      "",
    ].join("\n"),
  );
}

export async function main(argv: string[]): Promise<number> {
  const cmd = argv[2];
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    help();
    return 0;
  }
  if (cmd === "build") {
    const cwd = argv[3];
    const { manifestPath } = await buildCommand({ cwd });
    process.stdout.write(`knitkit: wrote ${manifestPath}\n`);
    return 0;
  }
  if (cmd === "types") {
    const sub = argv[3];
    if (sub === "generate") {
      const { generated } = await typesGenerateCommand({ cwd: argv[4] });
      process.stdout.write(`knitkit: generated ${generated.length} declaration file(s) in dist/types\n`);
      return 0;
    }
    if (sub === "sync") {
      const { written, declarationPath } = await typesSyncCommand({ cwd: argv[4] });
      process.stdout.write(`knitkit: synced ${written.length} remote type file(s); wrote ${declarationPath}\n`);
      return 0;
    }
    process.stderr.write(`knitkit types: unknown subcommand "${sub ?? ""}". Use "generate" or "sync".\n`);
    return 2;
  }
  if (cmd === "validate") {
    const target = argv[3];
    if (!target) {
      process.stderr.write("knitkit validate: <manifest> path required\n");
      return 2;
    }
    const r = await validateCommand(target);
    if (r.ok) {
      process.stdout.write(`knitkit: ${target} is valid\n`);
      return 0;
    }
    process.stderr.write(`knitkit: ${r.message}\n`);
    if (r.suggestion) process.stderr.write(`  suggestion: ${r.suggestion}\n`);
    return 1;
  }
  process.stderr.write(`knitkit: unknown command "${cmd}". Try "knitkit help".\n`);
  return 2;
}

// Run only when invoked as the CLI (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv).then(
    (code) => process.exit(code),
    (e) => {
      process.stderr.write(`knitkit: ${(e as Error).message}\n`);
      process.exit(1);
    },
  );
}
