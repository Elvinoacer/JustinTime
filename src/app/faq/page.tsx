import { constructMetadata } from "@/lib/metadata";
import FAQClient from "./FAQClient";

export const metadata = constructMetadata({
  title: "Frequently Asked Questions (FAQ)",
  description: "Find answers to common questions about JustInTime. Learn about booking services, payments, safety, and more.",
});

export default function FAQPage() {
  return <FAQClient />;
}
