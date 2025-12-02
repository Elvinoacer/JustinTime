import { constructMetadata } from "@/lib/metadata";
import ProfessionalsClient from "./ProfessionalsClient";

export const metadata = constructMetadata({
  title: "Find Professionals - Verified Experts",
  description: "Connect with top-rated professionals in your area. View profiles, ratings, and reviews to hire the best talent for your project.",
});

export default function ProfessionalsPage() {
  return <ProfessionalsClient />;
}
