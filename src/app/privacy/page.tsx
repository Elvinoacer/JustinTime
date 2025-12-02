import { constructMetadata } from "@/lib/metadata";
import PrivacyClient from "./PrivacyClient";

export const metadata = constructMetadata({
  title: "Privacy Policy - Your Data Security",
  description: "Read our Privacy Policy to understand how JustInTime collects, uses, and protects your personal information.",
});

export default function PrivacyPage() {
  return <PrivacyClient />;
}
