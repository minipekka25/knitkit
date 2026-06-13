import { cp, readFile, writeFile, rename, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "template");

function die(code: number, message: string, hint?: string): never {
  process.stderr.write(`\n  @knitkit/create: ${message}\n`);
  if (hint) process.stderr.write(`  ${hint}\n`);
  process.stderr.write("\n");
  process.exit(code);
}

function parseArgs(argv: string[]): { target: string; force: boolean } {
  let target: string | undefined;
  let force = false;
  for (const arg of argv) {
    if (arg === "--force" || arg === "-f") force = true;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write("\n  Usage: npm create @knitkit [dir] [--force]\n\n");
      process.exit(0);
    } else if (!arg.startsWith("-") && target === undefined) target = arg;
  }
  return { target: target ?? "knitkit-app", force };
}

async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch {
    return true;
  }
}

export async function main(argv: string[]): Promise<void> {
  const { target, force } = parseArgs(argv);
  const dest = resolve(process.cwd(), target);
  const appName = basename(dest);

  if (existsSync(dest)) {
    const s = await stat(dest);
    if (!s.isDirectory()) die(2, `"${target}" exists and is not a directory.`);
    if (!force && !(await isEmptyDir(dest))) {
      die(2, `"${target}" already exists and is not empty.`, "Pass --force to scaffold into it anyway.");
    }
  }

  await cp(TEMPLATE_DIR, dest, { recursive: true });

  // npm strips a published .gitignore, so the template ships it as `_gitignore`.
  const shippedIgnore = join(dest, "_gitignore");
  if (existsSync(shippedIgnore)) await rename(shippedIgnore, join(dest, ".gitignore"));

  // Personalize the scaffolded package.json name.
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.name = appName.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase() || "knitkit-app";
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const rel = target === "." ? "" : `cd ${target}\n  `;
  process.stdout.write(
    `\n  Scaffolded a knitkit starter in ${dest}\n\n` +
      `  A host that loadRemote()s a remote behind its own manifest, sharing one\n` +
      `  module instance across the boundary — no build step, no bundler plugin.\n\n` +
      `  Next:\n\n  ${rel}npm run dev        # http://localhost:8080\n\n` +
      `  Then open DevTools -> Network to watch the import map resolve.\n` +
      `  Docs: https://knitkit.mintlify.app\n\n`,
  );
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((e) => die(1, (e as Error).message));
}
