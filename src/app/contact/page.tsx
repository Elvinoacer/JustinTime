import { constructMetadata } from "@/lib/metadata";
import ContactClient from "./ContactClient";

export const metadata = constructMetadata({
  title: "Contact Us - Get in Touch",
  description: "Have questions? Contact JustInTime support team via email, phone, or our contact form. We're here to help you.",
});

export default function ContactPage() {
  return <ContactClient />;
}
