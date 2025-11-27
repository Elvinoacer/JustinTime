"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MapPin, Globe } from "lucide-react";

// Kenyan counties
const kenyanCounties = [
  "All Counties",
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya",
  "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
  "Vihiga", "Wajir", "West Pokot"
];

// Countries and their subdivisions
const countries = [
  { 
    name: "Kenya", 
    code: "KE",
    subdivisions: kenyanCounties
  },
  { 
    name: "Uganda", 
    code: "UG",
    subdivisions: ["All Regions", "Central", "Eastern", "Northern", "Western"]
  },
  { 
    name: "Tanzania", 
    code: "TZ",
    subdivisions: ["All Regions", "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Tanga"]
  },
  { 
    name: "Nigeria", 
    code: "NG",
    subdivisions: ["All States", "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"]
  },
  { 
    name: "South Africa", 
    code: "ZA",
    subdivisions: ["All Provinces", "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"]
  }
];

const Hero = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]); // Default to Kenya
  const [selectedLocation, setSelectedLocation] = useState(kenyanCounties[0]); // Default to "All Counties"

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setSelectedLocation(country.subdivisions[0]); // Reset to "All" when country changes
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedLocation && !selectedLocation.startsWith("All")) {
      params.append("location", selectedLocation);
    }
    if (selectedCountry.code !== "KE") {
      params.append("country", selectedCountry.code);
    }
    
    router.push(`/services?${params.toString()}`);
  };

  const handleCategoryClick = (category: string) => {
    router.push(`/services?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="relative rounded-b-3xl md:rounded-b-none overflow-hidden mx-4 mt-4 sm:mx-6 sm:mt-6 md:mx-0 md:mt-0">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/60 z-10"></div>
      <div
        className="flex min-h-[500px] sm:min-h-[600px] md:min-h-[700px] flex-col gap-8 items-center justify-center p-6 sm:p-8 md:p-10 text-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")',
        }}
      >
        <div className="z-20 flex flex-col gap-6 max-w-4xl">
          <motion.h1
            className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Find Trusted{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Professionals
            </span>{" "}
            Near You
          </motion.h1>

          <motion.h2
            className="text-gray-200 text-lg sm:text-xl md:text-2xl font-normal leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Connect with skilled local service providers for all your needs,
            from home repairs to personal services, right in your community.
          </motion.h2>
        </div>

        <motion.div
          className="z-20 w-full max-w-4xl mt-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Enhanced Search Container */}
          <div className="backdrop-blur-md bg-white/95 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Main Search Row */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input Section */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-emerald-600 text-2xl group-focus-within:scale-110 transition-transform">
                      search
                    </span>
                  </div>
                  <input
                    className="w-full pl-14 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none text-gray-800 placeholder-gray-500 text-base sm:text-lg font-medium focus:border-emerald-500 focus:bg-white transition-all duration-300"
                    placeholder="What service do you need?..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                {/* Location Selectors Section */}
                <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
                  {/* Country Selector */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Globe className="w-5 h-5 text-emerald-600 group-focus-within:scale-110 transition-transform" />
                    </div>
                    <select 
                      className="w-full sm:w-auto pl-12 pr-10 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 text-base font-semibold cursor-pointer outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25rem'
                      }}
                      value={selectedCountry.code}
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* County/State Selector */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="w-5 h-5 text-emerald-600 group-focus-within:scale-110 transition-transform" />
                    </div>
                    <select 
                      className="w-full sm:w-auto pl-12 pr-10 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 text-base font-semibold cursor-pointer outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25rem'
                      }}
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                    >
                      {selectedCountry.subdivisions.map((subdivision, index) => (
                        <option key={index} value={subdivision}>
                          {subdivision}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <div className="mt-4">
                <motion.button
                  className="w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60 transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                >
                  <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">
                    search
                  </span>
                  <span className="truncate">Search Now</span>
                </motion.button>
              </div>
            </div>

            {/* Current Selection Display Bar */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-3 border-t border-emerald-100">
              <div className="flex items-center justify-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <p className="text-gray-700">
                  Searching in{" "}
                  <span className="font-bold text-emerald-700">
                    {selectedLocation === selectedCountry.subdivisions[0] 
                      ? selectedCountry.name 
                      : `${selectedLocation}, ${selectedCountry.name}`}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["Plumbing", "Electrical", "Cleaning", "Repairs", "Painting"].map(
              (service, index) => (
                <motion.button
                  key={index}
                  className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium cursor-pointer hover:bg-white/20 transition-all duration-300 border border-white/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategoryClick(service)}
                >
                  {service}
                </motion.button>
              )
            )}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="z-20 mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {[
            { number: "500+", label: "Professionals" },
            { number: "2,500+", label: "Happy Clients" },
            { number: "98%", label: "Satisfaction Rate" },
            { number: "24/7", label: "Support" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                {stat.number}
              </div>
              <div className="text-sm sm:text-base text-gray-300 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating elements for visual interest */}
      <motion.div
        className="absolute top-20 left-10 w-6 h-6 rounded-full bg-emerald-400/20 z-0"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-16 w-8 h-8 rounded-full bg-white/10 z-0"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
    </div>
  );
};

export default Hero;
