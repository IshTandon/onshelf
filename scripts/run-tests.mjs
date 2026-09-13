import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const result = spawnSync(npm, ["run", "check"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
});

const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
const report = `${output}\nexit:${result.status ?? 1}\n`;
writeFileSync(join(root, "check-output.txt"), report);
process.stdout.write(report);
process.exit(result.status ?? 1);
