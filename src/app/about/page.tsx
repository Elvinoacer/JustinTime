import { constructMetadata } from "@/lib/metadata";
import AboutClient from "./AboutClient";

export const metadata = constructMetadata({
  title: "About Us - Our Mission & Vision",
  description: "Learn about JustInTime's mission to connect clients with trusted professionals. Discover our story, values, and the team behind the platform.",
});

export default function AboutPage() {
  return <AboutClient />;
}
