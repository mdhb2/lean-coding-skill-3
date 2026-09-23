import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("cli: repo root not found");
    dir = parent;
  }
}

const CLI = join(repoRoot(), "dist", "src", "cli.js");

function run(...args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
}

function project() {
  return mkdtempSync(join(tmpdir(), "lcs3-cli-"));
}

describe("primary CLI (SRC-005)", () => {
  it("prints help and package version without project state", () => {
    const help = run("--help");
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /task claim/);

    const version = run("--version");
    const pkg = JSON.parse(readFileSync(join(repoRoot(), "package.json"), "utf8")) as { version: string };
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout, `${pkg.version}\n`);
  });

  it("initializes only .lcs3, preserves legacy state, and is repeatable", () => {
    const root = project();
    const legacy = join(root, ".lcs", "state.md");
    mkdirSync(dirname(legacy), { recursive: true });
    writeFileSync(legacy, "legacy sentinel\n");

    for (let i = 0; i < 2; i++) {
      const result = run("init", "--project-root", root);
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotThrow(() => JSON.parse(result.stdout));
    }
    assert.ok(existsSync(join(root, ".lcs3", "config.yaml")));
    assert.ok(existsSync(join(root, ".lcs3", "manifests", "lifecycle.yaml")));
    assert.ok(existsSync(join(root, ".lcs3", "state.db")));
    assert.equal(readFileSync(legacy, "utf8"), "legacy sentinel\n");
  });

  it("runs task list, create, transition, and claim through project-local state", () => {
    const root = project();
    const init = run("init", "--project-root", root);
    assert.equal(init.status, 0, init.stderr);

    const option = ["--project-root", root];
    const empty = run("task", "list", ...option);
    assert.equal(empty.status, 0, empty.stderr);
    assert.deepEqual(JSON.parse(empty.stdout), []);

    const created = run("task", "create", "CLI-1", ...option);
    assert.equal(created.status, 0, created.stderr);
    assert.equal(JSON.parse(created.stdout).taskStatus, "pending");

    const transitioned = run("task", "transition", "CLI-1", "ready", ...option);
    assert.equal(transitioned.status, 0, transitioned.stderr);
    assert.equal(JSON.parse(transitioned.stdout).taskStatus, "ready");

    const claimed = run("task", "claim", "CLI-1", "--owner", "worker-a", "--lease-seconds", "120", ...option);
    assert.equal(claimed.status, 0, claimed.stderr);
    assert.equal(JSON.parse(claimed.stdout).owner, "worker-a");

    const listed = run("task", "list", ...option);
    assert.equal(listed.status, 0, listed.stderr);
    assert.deepEqual(
      JSON.parse(listed.stdout).map((task: { taskId: string; taskStatus: string }) => [task.taskId, task.taskStatus]),
      [["CLI-1", "claimed"]],
    );
  });

  it("rejects pre-init operations and malformed commands without creating state", () => {
    const root = project();
    const preInit = run("task", "list", "--project-root", root);
    assert.equal(preInit.status, 1);
    assert.match(preInit.stderr, /config\.yaml/);
    assert.equal(preInit.stdout, "");
    assert.equal(existsSync(join(root, ".lcs3", "state.db")), false);

    const malformed = run("task", "create", "--project-root", root);
    assert.equal(malformed.status, 2);
    assert.match(malformed.stderr, /expected exactly one/);
    assert.equal(existsSync(join(root, ".lcs3", "state.db")), false);

    const unknown = run("task", "not-a-command", "--project-root", root);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /unknown task command/);
    assert.equal(existsSync(join(root, ".lcs3", "state.db")), false);
  });
});
