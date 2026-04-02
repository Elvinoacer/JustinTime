import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceFile } from "./workspaceFile";

test("client sidebar includes My Jobs between Post a Job and My Proposals", () => {
  const content = readWorkspaceFile("src/components/ClientSidebar.tsx");

  const postJobIndex = content.indexOf(
    '{ name: "Post a Job", href: "/client/post-job", icon: "add_circle" },',
  );
  const myJobsIndex = content.indexOf(
    '{ name: "My Jobs", href: "/client/jobs", icon: "work" },',
  );
  const myProposalsIndex = content.indexOf(
    '{ name: "My Proposals", href: "/client/proposals", icon: "description" },',
  );

  assert.notEqual(postJobIndex, -1, "Post a Job nav item should exist");
  assert.notEqual(myJobsIndex, -1, "My Jobs nav item should exist");
  assert.notEqual(myProposalsIndex, -1, "My Proposals nav item should exist");
  assert.ok(
    postJobIndex < myJobsIndex && myJobsIndex < myProposalsIndex,
    "My Jobs should be between Post a Job and My Proposals",
  );
});

test("provider dashboard jobs page honors tab query and links to jobs marketplace", () => {
  const content = readWorkspaceFile("src/app/dashboard/jobs/page.tsx");

  assert.match(content, /useSearchParams/);
  assert.match(content, /const tabFromQuery = searchParams\.get\("tab"\)/);
  assert.match(content, /requestedTab/);
  assert.match(content, /href="\/jobs"/);
  assert.match(content, /href="\/dashboard\/team\/jobs"/);
});

test("admin sidebar contains Jobs navigation item", () => {
  const content = readWorkspaceFile("src/components/AdminSidebar.tsx");

  assert.match(
    content,
    /\{ name: "Jobs", href: "\/admin\/jobs", icon: Briefcase \}/,
  );
});
