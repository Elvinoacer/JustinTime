import { constructMetadata } from "@/lib/metadata";
import JobsClient from "./JobsClient";

export const metadata = constructMetadata({
  title: "Jobs - Find Work & Projects",
  description: "Browse available jobs and projects. Find new opportunities to grow your business and connect with clients looking for your skills.",
});

export default function JobsPage() {
  return <JobsClient />;
}
