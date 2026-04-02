import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceFile } from "./workspaceFile";

test("client jobs list page exists and fetches from /client/jobs", () => {
  const content = readWorkspaceFile("src/app/client/jobs/page.tsx");

  assert.match(content, /export default function ClientJobsPage\(/);
  assert.match(content, /apiClient\.get<ClientJobsResponse>\(/);
  assert.match(content, /`\/client\/jobs\?\$\{params\.toString\(\)\}`/);
  assert.match(content, /href="\/client\/post-job"/);
});

test("admin jobs page supports status, category, and search filters", () => {
  const content = readWorkspaceFile("src/app/admin/jobs/page.tsx");

  assert.match(content, /export default function AdminJobsPage\(/);
  assert.match(content, /statusFilter/);
  assert.match(content, /categoryFilter/);
  assert.match(content, /searchInput/);
});

test("client jobs API route supports pagination and filter query params", () => {
  const content = readWorkspaceFile("src/app/api/client/jobs/route.ts");

  assert.match(content, /searchParams\.get\("page"\)/);
  assert.match(content, /searchParams\.get\("pageSize"\)/);
  assert.match(content, /searchParams\.get\("status"\)/);
  assert.match(content, /searchParams\.get\("search"\)/);
  assert.match(
    content,
    /pagination:\s*\{[\s\S]*page,[\s\S]*pageSize,[\s\S]*total,[\s\S]*totalPages,[\s\S]*hasMore/,
  );
});
