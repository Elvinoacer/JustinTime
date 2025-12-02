import { constructMetadata } from "@/lib/metadata";
import CookiePolicyClient from "./CookiePolicyClient";

export const metadata = constructMetadata({
  title: "Cookie Policy - How We Use Cookies",
  description: "Learn about how JustInTime uses cookies to enhance your experience, analyze site traffic, and personalize content.",
});

export default function CookiePolicyPage() {
  return <CookiePolicyClient />;
}
