import { constructMetadata } from "@/lib/metadata";
import ServicesClient from "./ServicesClient";

export const metadata = constructMetadata({
  title: "Services - Find Professionals",
  description: "Browse our wide range of professional services. From home cleaning to electrical repairs, find the right expert for your needs.",
});

export default function ServicesPage() {
  return <ServicesClient />;
}
