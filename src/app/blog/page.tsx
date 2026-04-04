"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import {
  Search,
  Calendar,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  Filter,
  X,
  Mail,
} from "lucide-react";
import Link from "next/link";

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  slug: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "10 Essential Home Maintenance Tips for Every Season",
    excerpt:
      "Keep your home in top shape year-round with these expert-recommended maintenance tips.",
    category: "Home Improvement",
    author: "Sarah Johnson",
    date: "Nov 20, 2024",
    readTime: "5 min",
    image: "/api/placeholder/400/300",
    slug: "home-maintenance-tips-every-season",
  },
  {
    id: 2,
    title: "The Ultimate Guide to Spring Cleaning",
    excerpt:
      "Transform your space with our comprehensive spring cleaning checklist.",
    category: "Cleaning",
    author: "Michael Chen",
    date: "Nov 18, 2024",
    readTime: "7 min",
    image: "/api/placeholder/400/300",
    slug: "ultimate-guide-spring-cleaning",
  },
  {
    id: 3,
    title: "5 Signs You Need to Call a Professional Plumber",
    excerpt: "Don't ignore these warning signs to prevent costly water damage.",
    category: "Plumbing",
    author: "David Ochieng",
    date: "Nov 15, 2024",
    readTime: "4 min",
    image: "/api/placeholder/400/300",
    slug: "signs-need-professional-plumber",
  },
  {
    id: 4,
    title: "Electrical Safety: What Every Homeowner Should Know",
    excerpt:
      "Protect your family and property with these essential electrical safety tips.",
    category: "Electrical",
    author: "Jane Mwangi",
    date: "Nov 12, 2024",
    readTime: "6 min",
    image: "/api/placeholder/400/300",
    slug: "electrical-safety-homeowner-guide",
  },
  {
    id: 5,
    title: "Transform Your Space: Modern Painting Techniques",
    excerpt:
      "Discover the latest painting trends and techniques for a fresh look.",
    category: "Painting",
    author: "Alex Kimani",
    date: "Nov 10, 2024",
    readTime: "5 min",
    image: "/api/placeholder/400/300",
    slug: "modern-painting-techniques",
  },
  {
    id: 6,
    title: "Creating Your Dream Garden: A Beginner's Guide",
    excerpt:
      "Start your gardening journey with confidence and proper techniques.",
    category: "Gardening",
    author: "Grace Wanjiru",
    date: "Nov 8, 2024",
    readTime: "8 min",
    image: "/api/placeholder/400/300",
    slug: "dream-garden-beginners-guide",
  },
  {
    id: 7,
    title: "How to Choose the Right Service Provider",
    excerpt:
      "Make informed decisions when hiring professionals for home projects.",
    category: "Tips & Tricks",
    author: "Peter Kamau",
    date: "Nov 5, 2024",
    readTime: "6 min",
    image: "/api/placeholder/400/300",
    slug: "choose-right-service-provider",
  },
  {
    id: 8,
    title: "Budget-Friendly Home Repairs You Can DIY",
    excerpt: "Save money with these simple home repairs you can do yourself.",
    category: "DIY",
    author: "Lisa Akinyi",
    date: "Nov 3, 2024",
    readTime: "7 min",
    image: "/api/placeholder/400/300",
    slug: "budget-friendly-diy-repairs",
  },
  {
    id: 9,
    title: "Energy Efficiency: Small Changes, Big Impact",
    excerpt: "Reduce your utility bills with these easy energy-saving tips.",
    category: "Home Improvement",
    author: "Tom Njoroge",
    date: "Nov 1, 2024",
    readTime: "5 min",
    image: "/api/placeholder/400/300",
    slug: "energy-efficiency-tips",
  },
];

const categories = [
  "All",
  "Home Improvement",
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Painting",
  "Gardening",
  "Tips & Tricks",
  "DIY",
];

const categoryColors: Record<string, string> = {
  "Home Improvement": "bg-blue-100 text-blue-700",
  Cleaning: "bg-green-100 text-green-700",
  Plumbing: "bg-cyan-100 text-cyan-700",
  Electrical: "bg-yellow-100 text-yellow-700",
  Painting: "bg-purple-100 text-purple-700",
  Gardening: "bg-emerald-100 text-emerald-700",
  "Tips & Tricks": "bg-orange-100 text-orange-700",
  DIY: "bg-pink-100 text-pink-700",
};

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = blogPosts[0];
  const regularPosts = filteredPosts.slice(
    selectedCategory === "All" && !searchQuery ? 1 : 0
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-orange-50/20">
      <Header />
      <main className="flex-1 px-3 sm:px-4 py-8 sm:py-12 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              Editorial preview
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-lg shadow-orange-500/30">
              <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              JustInTime Blog
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
              Tips, insights, and expert advice on home maintenance and finding
              the right professionals.
            </p>
            <p className="mt-3 text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto px-2">
              This section is currently a curated preview while the full blog
              publishing workflow is being completed.
            </p>
          </div>

          {/* Search Bar with Mobile Filter Button */}
          <div className="mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-4 py-3 sm:py-4 bg-white border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm transition-all text-sm sm:text-base"
                />
              </div>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="md:hidden flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                aria-label="Filter categories"
              >
                {showMobileFilters ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Filter className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Category Filters - Mobile Overlay */}
          {showMobileFilters && (
            <div className="md:hidden fixed inset-x-0 top-20 z-50 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top">
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowMobileFilters(false);
                      }}
                      className={`px-4 py-2.5 rounded-full font-medium text-sm transition-all ${
                        selectedCategory === category
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category Filters - Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 sm:gap-3 justify-center mb-8 sm:mb-12 px-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-medium text-sm sm:text-base transition-all transform hover:scale-105 active:scale-95 ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Active Filters Display - Mobile */}
          <div className="md:hidden mb-6 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCategory === "All"
                    ? "All Categories"
                    : selectedCategory}
                </span>
                {selectedCategory !== "All" && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {filteredPosts.length}{" "}
                    {filteredPosts.length === 1 ? "article" : "articles"}
                  </span>
                )}
              </div>
              {(selectedCategory !== "All" || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearchQuery("");
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Featured Post - Mobile & Desktop */}
          {selectedCategory === "All" && !searchQuery && (
            <div className="mb-8 sm:mb-12 px-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  Featured Article
                </h2>
              </div>
              <Link href={`/blog/${featuredPost.slug}`}>
                <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
                  <div className="grid lg:grid-cols-2">
                    <div className="h-48 sm:h-56 md:h-64 lg:h-auto bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent"></div>
                      <Sparkles className="w-16 h-16 sm:w-20 sm:w-24 text-orange-600/30" />
                    </div>
                    <div className="p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                          categoryColors[featuredPost.category]
                        }`}
                      >
                        {featuredPost.category}
                      </span>
                      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                        {featuredPost.title}
                      </h3>
                      <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{featuredPost.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{featuredPost.readTime} read</span>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-6 flex items-center text-orange-600 font-semibold group-hover:gap-3 gap-2 transition-all text-sm sm:text-base">
                        <span>Read Full Article</span>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Blog Grid */}
          {regularPosts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl border border-gray-100 mx-2">
              <Search className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Try different keywords or browse all categories.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
                {selectedCategory === "All" && !searchQuery
                  ? "Latest Articles"
                  : "Articles"}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({regularPosts.length}{" "}
                  {regularPosts.length === 1 ? "article" : "articles"})
                </span>
              </h2>

              {/* Two Column Grid on Tablet/Desktop, Single on Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2">
                {regularPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                      <div className="h-40 sm:h-48 md:h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            categoryColors[post.category].includes("blue")
                              ? "from-blue-500/20"
                              : categoryColors[post.category].includes("green")
                              ? "from-green-500/20"
                              : categoryColors[post.category].includes("cyan")
                              ? "from-cyan-500/20"
                              : categoryColors[post.category].includes("yellow")
                              ? "from-yellow-500/20"
                              : categoryColors[post.category].includes("purple")
                              ? "from-purple-500/20"
                              : categoryColors[post.category].includes(
                                  "emerald"
                                )
                              ? "from-emerald-500/20"
                              : categoryColors[post.category].includes("orange")
                              ? "from-orange-500/20"
                              : "from-pink-500/20"
                          } to-transparent group-hover:scale-110 transition-transform duration-300`}
                        ></div>
                        <Sparkles
                          className={`w-12 h-12 sm:w-16 sm:h-16 ${
                            categoryColors[post.category].includes("blue")
                              ? "text-blue-600/30"
                              : categoryColors[post.category].includes("green")
                              ? "text-green-600/30"
                              : categoryColors[post.category].includes("cyan")
                              ? "text-cyan-600/30"
                              : categoryColors[post.category].includes("yellow")
                              ? "text-yellow-600/30"
                              : categoryColors[post.category].includes("purple")
                              ? "text-purple-600/30"
                              : categoryColors[post.category].includes(
                                  "emerald"
                                )
                              ? "text-emerald-600/30"
                              : categoryColors[post.category].includes("orange")
                              ? "text-orange-600/30"
                              : "text-pink-600/30"
                          }`}
                        />
                      </div>
                      <div className="p-4 sm:p-6 flex-1 flex flex-col">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                            categoryColors[post.category]
                          }`}
                        >
                          {post.category}
                        </span>
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="truncate">{post.author}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>{post.readTime}</span>
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center text-orange-600 font-medium group-hover:gap-2 gap-1 transition-all text-xs sm:text-sm">
                          <span>Read More</span>
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Newsletter CTA - Mobile Optimized */}
          <div className="mt-12 sm:mt-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl lg:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-xl shadow-orange-500/20 mx-2">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full mb-3 sm:mb-4">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Never Miss an Update
            </h2>
            <p className="text-orange-50 text-sm sm:text-base mb-4 sm:mb-6 max-w-2xl mx-auto">
              Subscribe for latest tips, guides, and insights delivered to your
              inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-sm sm:text-base"
              />
              <button className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm sm:text-base">
                Subscribe
              </button>
            </div>
            <p className="text-white/80 text-xs sm:text-sm mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="md:hidden mt-8 px-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <Link
                href="/"
                className="hover:text-orange-600 transition-colors"
              >
                ← Back to Home
              </Link>
              <Link
                href="/categories"
                className="hover:text-orange-600 transition-colors"
              >
                All Categories
              </Link>
              <Link
                href="/popular"
                className="hover:text-orange-600 transition-colors"
              >
                Popular
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
