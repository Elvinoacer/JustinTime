export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: string;
  image: string;
  body: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "home-maintenance-checklist-kenya",
    title: "A Practical Home Maintenance Checklist for Busy Homes in Kenya",
    excerpt:
      "A room-by-room checklist that helps households stay ahead of plumbing, electrical, cleaning, and repair issues before they become expensive.",
    category: "Home Improvement",
    author: "JustInTime Editorial",
    publishedAt: "2026-03-12",
    readTime: "6 min read",
    image: "/images/og-image.png",
    body: [
      "Regular maintenance works best when it is small, predictable, and seasonal. Instead of waiting for a tap to burst or a socket to fail, build a monthly habit of checking the systems you rely on every day.",
      "Start with plumbing. Look for slow leaks under sinks, weak shower pressure, damp cabinet corners, and toilets that continue running after a flush. Small leaks are easy to ignore, but they quietly increase utility bills and damage finishes over time.",
      "Move next to power and lighting. Test outdoor security lights, replace weak bulbs, and pay attention to sockets that feel loose, spark, or warm up during use. Those are early warning signs that should not be postponed.",
      "Kitchens and wet areas deserve the most attention. Deep-cleaning drains, checking silicone seals, and inspecting appliance hoses can prevent the most disruptive home emergencies.",
      "If a task needs a specialist, document the issue early with photos and a short description. That makes it easier to compare professionals and get accurate pricing before the problem grows.",
    ],
  },
  {
    slug: "how-to-hire-a-trusted-pro",
    title: "How to Hire a Trusted Professional Without Guesswork",
    excerpt:
      "A simple framework for comparing service providers on trust, pricing clarity, communication, and proof of previous work.",
    category: "Tips & Tricks",
    author: "JustInTime Editorial",
    publishedAt: "2026-02-24",
    readTime: "5 min read",
    image: "/images/profile.png",
    body: [
      "The safest hiring decisions usually come from a few consistent signals rather than one impressive promise. Start by checking whether the provider profile shows verification, reviews, and a clear service scope.",
      "Next, compare how specific each quote is. Strong professionals explain what is included, what can change the price, and how long the work should take. Vague quotes often create the most expensive surprises later.",
      "Look for evidence of communication quality before the work begins. Fast responses, useful follow-up questions, and realistic timelines are usually better predictors of a smooth job than the lowest price.",
      "Finally, review recent work samples with context. Ask what problem the client had, what solution was delivered, and whether any follow-up was needed after completion.",
    ],
  },
  {
    slug: "when-surge-pricing-appears",
    title: "Why Prices Sometimes Change During High-Demand Booking Windows",
    excerpt:
      "An explanation of dynamic pricing, what causes it, and how to spot time-sensitive price changes before confirming a booking.",
    category: "Pricing",
    author: "JustInTime Editorial",
    publishedAt: "2026-01-30",
    readTime: "4 min read",
    image: "/images/JustinTimeLogo.png",
    body: [
      "Some services cost more at peak times because demand, timing, urgency, and provider availability all move together. Dynamic pricing is a way to reflect that live market pressure rather than using one flat price at all hours.",
      "The most common triggers are urgent same-day requests, heavy evening demand, weather disruptions, and narrow availability windows. In those cases, the platform may show a higher live amount than the provider's usual starting price.",
      "The key is transparency. Guests should be able to see when a dynamic uplift is active, compare the adjusted amount to the base price, and decide whether to proceed now or schedule for a lower-demand window.",
    ],
  },
  {
    slug: "client-job-posting-tips",
    title: "How to Post a Better Job and Get Better Proposals",
    excerpt:
      "Clear briefs attract faster, more accurate proposals. Here is what to include when posting a public job.",
    category: "Jobs",
    author: "JustInTime Editorial",
    publishedAt: "2025-12-18",
    readTime: "5 min read",
    image: "/images/og-image.png",
    body: [
      "The fastest way to improve proposal quality is to reduce ambiguity in the first post. A good brief explains the problem, the location, the budget range, and the result you expect after the work is finished.",
      "Include dimensions, photos, urgency, and any access constraints. Professionals write stronger proposals when they know whether they are quoting labour only, labour plus materials, or an inspection visit first.",
      "If timing is flexible, say so. Flexible deadlines often produce better pricing and wider availability than urgent same-day jobs.",
    ],
  },
];

export const blogCategories = Array.from(
  new Set(["All", ...blogPosts.map((post) => post.category)]),
);

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
