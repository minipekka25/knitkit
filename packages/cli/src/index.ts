import { buildCommand } from "./commands/build.js";
import { validateCommand } from "./commands/validate.js";
import { typesGenerateCommand } from "./commands/typesGenerate.js";
import { typesSyncCommand } from "./commands/typesSync.js";

function help(): void {
  process.stdout.write(
    [
      "fedkit — runtime-first module federation",
      "",
      "Usage:",
      "  fedkit build [cwd]            Emit dist/shared/*, dist/exposes/*, dist/fed.manifest.json",
      "  fedkit types generate [cwd]   Generate .d.ts per exposed module, patch the manifest",
      "  fedkit types sync [cwd]       Fetch remotes' types (fed.host.json), type loadRemote()",
      "  fedkit validate <manifest>    Validate a manifest against the spec",
      "  fedkit help                   Show this help",
      "",
    ].join("\n"),
  );
}

async function main(argv: string[]): Promise<number> {
  const cmd = argv[2];
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    help();
    return 0;
  }
  if (cmd === "build") {
    const cwd = argv[3];
    const { manifestPath } = await buildCommand({ cwd });
    process.stdout.write(`fedkit: wrote ${manifestPath}\n`);
    return 0;
  }
  if (cmd === "types") {
    const sub = argv[3];
    if (sub === "generate") {
      const { generated } = await typesGenerateCommand({ cwd: argv[4] });
      process.stdout.write(`fedkit: generated ${generated.length} declaration file(s) in dist/types\n`);
      return 0;
    }
    if (sub === "sync") {
      const { written, declarationPath } = await typesSyncCommand({ cwd: argv[4] });
      process.stdout.write(`fedkit: synced ${written.length} remote type file(s); wrote ${declarationPath}\n`);
      return 0;
    }
    process.stderr.write(`fedkit types: unknown subcommand "${sub ?? ""}". Use "generate" or "sync".\n`);
    return 2;
  }
  if (cmd === "validate") {
    const target = argv[3];
    if (!target) {
      process.stderr.write("fedkit validate: <manifest> path required\n");
      return 2;
    }
    const r = await validateCommand(target);
    if (r.ok) {
      process.stdout.write(`fedkit: ${target} is valid\n`);
      return 0;
    }
    process.stderr.write(`fedkit: ${r.message}\n`);
    if (r.suggestion) process.stderr.write(`  suggestion: ${r.suggestion}\n`);
    return 1;
  }
  process.stderr.write(`fedkit: unknown command "${cmd}". Try "fedkit help".\n`);
  return 2;
}

main(process.argv).then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`fedkit: ${(e as Error).message}\n`);
    process.exit(1);
  },
);
