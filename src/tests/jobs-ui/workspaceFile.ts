import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testsRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(testsRoot, "../../..");

export function readWorkspaceFile(relativePath: string): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.readFileSync(absolutePath, "utf8");
}
