import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceFile } from "./workspaceFile";

test("client job share action copies public job URL", () => {
  const content = readWorkspaceFile("src/app/client/jobs/[id]/page.tsx");

  assert.match(
    content,
    /const handleShareJob = \(\) => \{[\s\S]*window\.location\.origin\}\/jobs\/\$\{jobId\}/,
  );
});

test("provider job alert email links to public job page", () => {
  const content = readWorkspaceFile("src/app/api/jobs/route.ts");

  assert.match(
    content,
    /\$\{process\.env\.NEXTAUTH_URL\}\/jobs\/\$\{job\.id\}/,
  );
  assert.doesNotMatch(
    content,
    /\$\{process\.env\.NEXTAUTH_URL\}\/dashboard\/jobs\/\$\{job\.id\}/,
  );
});

test("proposal status notification link targets applied tab", () => {
  const content = readWorkspaceFile("src/lib/proposals/statusNotifications.ts");

  assert.match(content, /\/dashboard\/jobs\?tab=applied/);
});

test("admin jobs page routes to admin and public job views", () => {
  const content = readWorkspaceFile("src/app/admin/jobs/page.tsx");

  assert.match(content, /href=\{`\/admin\/jobs\/\$\{job\.id\}`\}/);
  assert.match(content, /href=\{`\/jobs\/\$\{job\.id\}`\}/);
});

test("admin job detail page exists for proposal inspection", () => {
  const content = readWorkspaceFile("src/app/admin/jobs/[id]/page.tsx");

  assert.match(content, /export default async function AdminJobDetailsPage/);
  assert.match(content, /job\.proposals/);
});
