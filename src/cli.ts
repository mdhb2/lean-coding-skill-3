#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { claimTask } from "./claims.js";
import { loadProjectConfig } from "./config.js";
import { bootstrapDatabase, defaultStateDbPath } from "./db.js";
import { initProject } from "./init.js";
import { validateManifests } from "./manifests.js";
import { listTasks } from "./state.js";
import { createTask, transitionTask } from "./transitions.js";

class CliError extends Error {
  constructor(message: string, readonly exitCode: number) {
    super(message);
  }
}

const manifestRoot = (projectRoot: string): string => join(projectRoot, ".lcs3", "manifests");

function projectContext(projectRoot: string) {
  const root = resolve(projectRoot);
  const config = loadProjectConfig(root);
  const manifests = validateManifests(manifestRoot(root));
  const errors = [...config.errors, ...manifests];
  if (errors.length) throw new Error(errors.map(({ file, message }) => `${file}: ${message}`).join("\n"));
  if (!config.config) throw new Error("invalid .lcs3/config.yaml");
  const dbPath = defaultStateDbPath(root);
  if (!existsSync(dbPath)) throw new Error(`runtime database not initialized at ${dbPath}; run lcs3 init first`);
  return { root, dbPath, manifestDir: manifestRoot(root), leaseSeconds: config.config.execution.lease_seconds };
}

function parse(command: string, args: string[], options: ParseArgsOptionsConfig) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (error) {
    throw new CliError(`${command}: ${(error as Error).message}`, 2);
  }
}

function stringOption(
  values: Record<string, string | boolean | (string | boolean)[] | undefined>,
  name: string,
): string | undefined {
  const value = values[name];
  return typeof value === "string" ? value : undefined;
}

function emit(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function run(argv: string[]): void {
  const [command, subcommand, ...args] = argv;
  if (!command || command === "help" || (command === "--help" && !subcommand)) {
    process.stdout.write("Usage: lcs3 <init|task> [options]\n       lcs3 --help | --version\n\nCommands:\n  init [--project-root <path>]\n  task list [--project-root <path>]\n  task create <task-id> [--project-root <path>]\n  task transition <task-id> <status> [--project-root <path>]\n  task claim <task-id> --owner <worker-id> [--lease-seconds <seconds>] [--project-root <path>]\n");
    return;
  }
  if (command === "--version") {
    const packagePath = join(dirname(fileURLToPath(import.meta.url)), "../../package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { version: string };
    process.stdout.write(`${pkg.version}\n`);
    return;
  }
  if (command === "init") {
    const parsed = parse("init", [subcommand, ...args].filter((arg): arg is string => arg !== undefined), {
      "project-root": { type: "string" },
    });
    if (parsed.positionals.length) throw new CliError("init: unexpected positional arguments", 2);
    const projectRoot = stringOption(parsed.values, "project-root");
    if (projectRoot === "") throw new CliError("init: --project-root must not be empty", 2);
    const root = resolve(projectRoot ?? process.cwd());
    const result = initProject(root);
    if (result.errors.length) throw new Error(result.errors.map(({ file, message }) => `${file}: ${message}`).join("\n"));
    const db = bootstrapDatabase(defaultStateDbPath(root));
    if (db.errors.length) throw new Error(db.errors.map(({ message }) => message).join("\n"));
    emit({ projectRoot: root, created: result.created, kept: result.kept });
    return;
  }
  if (command !== "task") throw new CliError(`unknown command '${command}'`, 2);
  if (!subcommand) throw new CliError("task: expected list, create, transition, or claim", 2);
  if (!["list", "create", "transition", "claim"].includes(subcommand)) {
    throw new CliError(`unknown task command '${subcommand}'`, 2);
  }

  const options = {
    "project-root": { type: "string" },
    owner: { type: "string" },
    "lease-seconds": { type: "string" },
  } as const;
  const parsed = parse(`task ${subcommand}`, [args[0], ...args.slice(1)].filter((arg): arg is string => arg !== undefined), options);
  const projectRoot = stringOption(parsed.values, "project-root");
  if (projectRoot === "") throw new CliError(`task ${subcommand}: --project-root must not be empty`, 2);
  const root = projectRoot ?? process.cwd();
  if (subcommand === "list") {
    if (parsed.positionals.length) throw new CliError("task list: unexpected positional arguments", 2);
    const ctx = projectContext(root);
    emit(listTasks(ctx.dbPath));
  } else if (subcommand === "create") {
    const [taskId, ...extra] = parsed.positionals;
    if (!taskId || extra.length) throw new CliError("task create: expected exactly one <task-id>", 2);
    const ctx = projectContext(root);
    emit(createTask(ctx.dbPath, taskId, "pending", ctx.manifestDir));
  } else if (subcommand === "transition") {
    const [taskId, status, ...extra] = parsed.positionals;
    if (!taskId || !status || extra.length) throw new CliError("task transition: expected <task-id> <status>", 2);
    const ctx = projectContext(root);
    emit(transitionTask(ctx.dbPath, taskId, status, ctx.manifestDir));
  } else if (subcommand === "claim") {
    const [taskId, ...extra] = parsed.positionals;
    const owner = stringOption(parsed.values, "owner");
    const leaseArg = stringOption(parsed.values, "lease-seconds");
    if (!taskId || extra.length || !owner) throw new CliError("task claim: expected <task-id> and --owner <worker-id>", 2);
    const ctx = projectContext(root);
    const leaseSeconds = leaseArg === undefined ? ctx.leaseSeconds : Number(leaseArg);
    if (!Number.isInteger(leaseSeconds) || leaseSeconds <= 0) throw new CliError("task claim: --lease-seconds must be a positive integer", 2);
    emit(claimTask(ctx.dbPath, taskId, owner, leaseSeconds, Date.now(), ctx.manifestDir));
  } else {
    throw new CliError(`unknown task command '${subcommand}'`, 2);
  }
}

try {
  run(process.argv.slice(2));
} catch (error) {
  const exitCode = error instanceof CliError ? error.exitCode : 1;
  process.stderr.write(`${(error as Error).message}\n`);
  process.exitCode = exitCode;
}
