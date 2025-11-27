'use client';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Search, Calendar, Clock, User, ChevronRight, Sparkles } from "lucide-react";
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
    excerpt: "Keep your home in top shape year-round with these expert-recommended maintenance tips. Learn what to check and when to ensure your home stays comfortable and safe.",
    category: "Home Improvement",
    author: "Sarah Johnson",
    date: "November 20, 2024",
    readTime: "5 min read",
    image: "/api/placeholder/400/300",
    slug: "home-maintenance-tips-every-season"
  },
  {
    id: 2,
    title: "The Ultimate Guide to Spring Cleaning",
    excerpt: "Transform your space with our comprehensive spring cleaning checklist. From decluttering tips to deep-cleaning techniques, we've got you covered.",
    category: "Cleaning",
    author: "Michael Chen",
    date: "November 18, 2024",
    readTime: "7 min read",
    image: "/api/placeholder/400/300",
    slug: "ultimate-guide-spring-cleaning"
  },
  {
    id: 3,
    title: "5 Signs You Need to Call a Professional Plumber",
    excerpt: "Don't ignore these warning signs! Learn when it's time to call in the experts to prevent costly water damage and repairs in your home.",
    category: "Plumbing",
    author: "David Ochieng",
    date: "November 15, 2024",
    readTime: "4 min read",
    image: "/api/placeholder/400/300",
    slug: "signs-need-professional-plumber"
  },
  {
    id: 4,
    title: "Electrical Safety: What Every Homeowner Should Know",
    excerpt: "Protect your family and property with these essential electrical safety tips. Learn to identify hazards and when to call a licensed electrician.",
    category: "Electrical",
    author: "Jane Mwangi",
    date: "November 12, 2024",
    readTime: "6 min read",
    image: "/api/placeholder/400/300",
    slug: "electrical-safety-homeowner-guide"
  },
  {
    id: 5,
    title: "Transform Your Space: Modern Painting Techniques",
    excerpt: "Discover the latest painting trends and techniques to give your home a fresh, modern look. From color selection to application methods.",
    category: "Painting",
    author: "Alex Kimani",
    date: "November 10, 2024",
    readTime: "5 min read",
    image: "/api/placeholder/400/300",
    slug: "modern-painting-techniques"
  },
  {
    id: 6,
    title: "Creating Your Dream Garden: A Beginner's Guide",
    excerpt: "Start your gardening journey with confidence. Learn about soil preparation, plant selection, and maintenance tips for a thriving garden.",
    category: "Gardening",
    author: "Grace Wanjiru",
    date: "November 8, 2024",
    readTime: "8 min read",
    image: "/api/placeholder/400/300",
    slug: "dream-garden-beginners-guide"
  },
  {
    id: 7,
    title: "How to Choose the Right Service Provider",
    excerpt: "Make informed decisions when hiring professionals for your home projects. Learn what to look for, questions to ask, and red flags to avoid.",
    category: "Tips & Tricks",
    author: "Peter Kamau",
    date: "November 5, 2024",
    readTime: "6 min read",
    image: "/api/placeholder/400/300",
    slug: "choose-right-service-provider"
  },
  {
    id: 8,
    title: "Budget-Friendly Home Repairs You Can DIY",
    excerpt: "Save money with these simple home repairs you can do yourself. We'll show you which projects are DIY-friendly and which require professional help.",
    category: "DIY",
    author: "Lisa Akinyi",
    date: "November 3, 2024",
    readTime: "7 min read",
    image: "/api/placeholder/400/300",
    slug: "budget-friendly-diy-repairs"
  },
  {
    id: 9,
    title: "Energy Efficiency: Small Changes, Big Impact",
    excerpt: "Reduce your utility bills and environmental footprint with these easy energy-saving tips for your home. Start saving money today!",
    category: "Home Improvement",
    author: "Tom Njoroge",
    date: "November 1, 2024",
    readTime: "5 min read",
    image: "/api/placeholder/400/300",
    slug: "energy-efficiency-tips"
  }
];

const categories = ["All", "Home Improvement", "Cleaning", "Plumbing", "Electrical", "Painting", "Gardening", "Tips & Tricks", "DIY"];

const categoryColors: Record<string, string> = {
  "Home Improvement": "bg-blue-100 text-blue-700",
  "Cleaning": "bg-green-100 text-green-700",
  "Plumbing": "bg-cyan-100 text-cyan-700",
  "Electrical": "bg-yellow-100 text-yellow-700",
  "Painting": "bg-purple-100 text-purple-700",
  "Gardening": "bg-emerald-100 text-emerald-700",
  "Tips & Tricks": "bg-orange-100 text-orange-700",
  "DIY": "bg-pink-100 text-pink-700"
};

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Featured post (first post)
  const featuredPost = blogPosts[0];
  const regularPosts = filteredPosts.slice(selectedCategory === "All" && !searchQuery ? 1 : 0);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-orange-50/20">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-lg shadow-orange-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-orange-900 to-gray-900 bg-clip-text text-transparent">
              JustInTime Blog
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tips, insights, and expert advice on home maintenance, finding the right professionals, and keeping your space in perfect condition.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all transform hover:scale-105 ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Featured Post (only show if All and no search) */}
          {selectedCategory === "All" && !searchQuery && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900">Featured Article</h2>
              </div>
              <Link href={`/blog/${featuredPost.slug}`}>
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="h-64 md:h-auto bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent"></div>
                      <Sparkles className="w-24 h-24 text-orange-600/30" />
                    </div>
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 w-fit ${categoryColors[featuredPost.category]}`}>
                        {featuredPost.category}
                      </span>
                      <h3 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">
                        {featuredPost.title}
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{featuredPost.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{featuredPost.readTime}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center text-orange-600 font-semibold group-hover:gap-3 gap-2 transition-all">
                        <span>Read Article</span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Blog Grid */}
          {regularPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600">Try different keywords or browse all categories.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {selectedCategory === "All" && !searchQuery ? "Latest Articles" : "Articles"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${
                          categoryColors[post.category].includes('blue') ? 'from-blue-500/20' :
                          categoryColors[post.category].includes('green') ? 'from-green-500/20' :
                          categoryColors[post.category].includes('cyan') ? 'from-cyan-500/20' :
                          categoryColors[post.category].includes('yellow') ? 'from-yellow-500/20' :
                          categoryColors[post.category].includes('purple') ? 'from-purple-500/20' :
                          categoryColors[post.category].includes('emerald') ? 'from-emerald-500/20' :
                          categoryColors[post.category].includes('orange') ? 'from-orange-500/20' :
                          'from-pink-500/20'
                        } to-transparent group-hover:scale-110 transition-transform duration-300`}></div>
                        <Sparkles className={`w-16 h-16 ${
                          categoryColors[post.category].includes('blue') ? 'text-blue-600/30' :
                          categoryColors[post.category].includes('green') ? 'text-green-600/30' :
                          categoryColors[post.category].includes('cyan') ? 'text-cyan-600/30' :
                          categoryColors[post.category].includes('yellow') ? 'text-yellow-600/30' :
                          categoryColors[post.category].includes('purple') ? 'text-purple-600/30' :
                          categoryColors[post.category].includes('emerald') ? 'text-emerald-600/30' :
                          categoryColors[post.category].includes('orange') ? 'text-orange-600/30' :
                          'text-pink-600/30'
                        }`} />
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 w-fit ${categoryColors[post.category]}`}>
                          {post.category}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            <span>{post.author}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{post.readTime}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-orange-600 font-medium group-hover:gap-2 gap-1 transition-all text-sm">
                          <span>Read More</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 md:p-12 text-center shadow-xl shadow-orange-500/20">
            <Sparkles className="w-12 h-12 text-white/90 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Never Miss an Update
            </h2>
            <p className="text-orange-50 mb-6 max-w-2xl mx-auto text-lg">
              Subscribe to our newsletter for the latest tips, guides, and insights delivered straight to your inbox.
            </p>
            <p className="text-white/90 text-sm">
              Scroll down to subscribe via our footer newsletter form!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
