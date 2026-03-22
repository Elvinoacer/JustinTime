"use client";
import { motion, useInView } from "framer-motion";
import { Globe, MapPin, Search, Shield, Star, CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const kenyanCounties = [
  "All Counties", "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet",
  "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
  "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale",
  "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
  "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok",
  "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta",
  "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
  "Vihiga", "Wajir", "West Pokot",
];

const countries = [
  { name: "Kenya", code: "KE", subdivisions: kenyanCounties },
  { name: "Uganda", code: "UG", subdivisions: ["All Regions", "Central", "Eastern", "Northern", "Western"] },
  { name: "Tanzania", code: "TZ", subdivisions: ["All Regions", "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Tanga"] },
  { name: "Nigeria", code: "NG", subdivisions: ["All States", "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"] },
  { name: "South Africa", code: "ZA", subdivisions: ["All Provinces", "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"] },
];

const floatingAvatars = [
  { name: "Sarah", role: "Plumber", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", position: "top-[18%] left-[7%]", delay: 0, duration: 5, size: "w-16 h-16" },
  { name: "Anita", role: "Cleaner", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", position: "top-[45%] left-[5%]", delay: 1.2, duration: 6, size: "w-14 h-14" },
  { name: "David", role: "Electrician", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", position: "bottom-[30%] left-[6%]", delay: 0.6, duration: 7, size: "w-12 h-12" },
  { name: "David", role: "Fundi", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", position: "top-[16%] right-[7%]", delay: 0.3, duration: 5.5, size: "w-14 h-14" },
  { name: "Risika", role: "Freelancer", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", position: "top-[42%] right-[5%]", delay: 1.8, duration: 6.5, size: "w-13 h-13" },
  { name: "Anita", role: "Painter", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", position: "bottom-[28%] right-[7%]", delay: 0.9, duration: 5, size: "w-11 h-11" },
];

function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end, duration]);

  return { count, ref };
}

const Hero = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [selectedLocation, setSelectedLocation] = useState(kenyanCounties[0]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setSelectedLocation(country.subdivisions[0]);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedLocation && !selectedLocation.startsWith("All")) params.append("location", selectedLocation);
    if (selectedCountry.code !== "KE") params.append("country", selectedCountry.code);
    router.push(`/services?${params.toString()}`);
  };

  const stat1 = useCounter(500, 2000);
  const stat2 = useCounter(2500, 2200);
  const stat3 = useCounter(98, 1800);

  return (
    <section className="relative min-h-[90svh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/bannervid.mp4" type="video/mp4" />
        </video>
        {/* Dark overlays to blend with the aesthetic and preserve text contrast */}
        <div className="absolute inset-0 bg-[#0a1a15]/75 mix-blend-normal" />
        <div className="absolute inset-0 bg-[#0a1a15]/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a15] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1a15]/50 via-transparent to-transparent" />
      </div>

      {/* Floating Avatars */}
      {floatingAvatars.map((avatar, i) => (
        <motion.div
          key={i}
          className={`hidden md:flex absolute ${avatar.position} z-10 flex-col items-center gap-1`}
          animate={{ y: [0, i % 2 === 0 ? -14 : 12, 0] }}
          transition={{ duration: avatar.duration, repeat: Infinity, ease: "easeInOut", delay: avatar.delay }}
        >
          <div className={`${avatar.size} rounded-full ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-[#0a1a15] overflow-hidden shadow-lg shadow-emerald-500/20`}>
            <img src={avatar.img} alt={avatar.name} className="w-full h-full object-cover" />
          </div>
          <div className="mt-1 text-center">
            <p className="text-white text-[10px] font-semibold leading-none drop-shadow-md">{avatar.name}</p>
            <p className="text-emerald-400/80 text-[9px] leading-none mt-0.5 drop-shadow-md">({avatar.role})</p>
          </div>
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-20 w-full max-w-3xl px-4 sm:px-6 flex flex-col items-center text-center">
        <motion.h1
          className="text-3xl sm:text-5xl md:text-[3.5rem] lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Find Trusted
          <br />
          <span className="text-white">Professionals</span> Near You
        </motion.h1>

        <motion.p
          className="mt-5 text-gray-300 font-medium text-sm sm:text-base md:text-lg max-w-xl leading-relaxed drop-shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          Connect with verified Kenyan experts for your home and business needs instantly.
        </motion.p>

        {/* Search Bar — Pill on Desktop */}
        <motion.div
          className="w-full mt-8 sm:mt-10"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {/* Desktop pill search */}
          <div className="hidden sm:flex items-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-full p-1.5 shadow-2xl shadow-black/40">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-11 pr-3 py-3 bg-transparent outline-none text-white placeholder-gray-400 text-sm font-medium"
                placeholder="Find a plumber, electrician, painter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <div className="relative">
              <button
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex items-center gap-2 px-3 py-3 text-gray-200 text-sm hover:text-white transition-colors font-medium"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="max-w-[80px] truncate text-xs">
                  {selectedLocation === selectedCountry.subdivisions[0] ? selectedCountry.name : selectedLocation}
                </span>
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isLocationOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 max-h-72 overflow-y-auto bg-[#0a1a15] border border-emerald-500/30 rounded-xl shadow-2xl shadow-black/60 z-50 py-1">
                  <div className="px-3 py-2 border-b border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5"><Globe className="w-3 h-3" /> Country</div>
                    <div className="flex gap-1 flex-wrap">
                      {countries.map((c) => (
                        <button key={c.code} onClick={() => handleCountryChange(c.code)} className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${selectedCountry.code === c.code ? "bg-emerald-500/30 text-emerald-400" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedCountry.subdivisions.map((sub, idx) => (
                    <button key={idx} onClick={() => { setSelectedLocation(sub); setIsLocationOpen(false); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedLocation === sub ? "text-emerald-400 bg-emerald-500/20 font-medium" : "text-gray-300 hover:bg-white/10"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <motion.button
              className="px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-full hover:bg-emerald-400 transition-colors whitespace-nowrap shadow-lg shadow-emerald-500/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSearch}
            >
              Search Now
            </motion.button>
          </div>

          {/* Mobile stacked search */}
          <div className="sm:hidden backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-3 shadow-2xl shadow-black/40">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl outline-none text-white placeholder-gray-400 text-sm font-medium" placeholder="What service do you need?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            </div>
            <div className="flex gap-2 mb-2">
              <select className="flex-1 pl-3 pr-6 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white text-xs font-medium outline-none appearance-none" value={selectedCountry.code} onChange={(e) => handleCountryChange(e.target.value)}>
                {countries.map((c) => (<option key={c.code} value={c.code} className="bg-[#0a1a15]">{c.name}</option>))}
              </select>
              <select className="flex-1 pl-3 pr-6 py-3 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white text-xs font-medium outline-none appearance-none" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                {selectedCountry.subdivisions.map((s, i) => (<option key={i} value={s} className="bg-[#0a1a15]">{s}</option>))}
              </select>
            </div>
            <button className="w-full py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20" onClick={handleSearch}>Search Now</button>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div className="mt-6 flex flex-wrap justify-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}>
          {[
            { icon: Shield, text: "Verified Pros" },
            { icon: CreditCard, text: "Secure Payments" },
            { icon: Star, text: "Rated 4.8/5" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 border border-white/10 text-xs font-medium shadow-lg">
              <b.icon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-200">{b.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div className="mt-14 grid grid-cols-3 gap-8 w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
          <div className="text-center" ref={stat1.ref}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tabular-nums drop-shadow-lg">{stat1.count}<span className="text-emerald-400">+</span></div>
            <div className="text-[11px] text-gray-300 mt-1 font-bold uppercase tracking-wider drop-shadow-md">Verified Pros</div>
          </div>
          <div className="text-center" ref={stat2.ref}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tabular-nums drop-shadow-lg">{stat2.count >= 1000 ? `${(stat2.count / 1000).toFixed(1)}k` : stat2.count}<span className="text-emerald-400">+</span></div>
            <div className="text-[11px] text-gray-300 mt-1 font-bold uppercase tracking-wider drop-shadow-md">Happy Clients</div>
          </div>
          <div className="text-center" ref={stat3.ref}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tabular-nums drop-shadow-lg">{stat3.count}<span className="text-emerald-400">%</span></div>
            <div className="text-[11px] text-gray-300 mt-1 font-bold uppercase tracking-wider drop-shadow-md">Satisfaction</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
