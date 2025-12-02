import { constructMetadata } from "@/lib/metadata";
import TermsClient from "./TermsClient";

export const metadata = constructMetadata({
  title: "Terms of Service - User Agreement",
  description: "Review the Terms of Service for using JustInTime. Understand your rights, responsibilities, and our platform rules.",
});

export default function TermsPage() {
  return <TermsClient />;
}
