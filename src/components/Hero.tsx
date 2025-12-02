"use client";
import { motion } from "framer-motion";
import { Globe, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Kenyan counties
const kenyanCounties = [
  "All Counties",
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];

// Countries and their subdivisions
const countries = [
  {
    name: "Kenya",
    code: "KE",
    subdivisions: kenyanCounties,
  },
  {
    name: "Uganda",
    code: "UG",
    subdivisions: ["All Regions", "Central", "Eastern", "Northern", "Western"],
  },
  {
    name: "Tanzania",
    code: "TZ",
    subdivisions: [
      "All Regions",
      "Dar es Salaam",
      "Arusha",
      "Dodoma",
      "Mwanza",
      "Tanga",
    ],
  },
  {
    name: "Nigeria",
    code: "NG",
    subdivisions: [
      "All States",
      "Lagos",
      "Abuja",
      "Kano",
      "Ibadan",
      "Port Harcourt",
    ],
  },
  {
    name: "South Africa",
    code: "ZA",
    subdivisions: [
      "All Provinces",
      "Gauteng",
      "Western Cape",
      "KwaZulu-Natal",
      "Eastern Cape",
    ],
  },
];

const Hero = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [selectedLocation, setSelectedLocation] = useState(kenyanCounties[0]);

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
    <div className="relative overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/50 z-10"></div>
      <div
        className="flex min-h-[500px] xs:min-h-[550px] sm:min-h-[600px] md:min-h-[700px] flex-col gap-4 sm:gap-6 md:gap-8 items-center justify-center p-4 xs:p-5 sm:p-6 md:p-8 lg:p-10 text-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")',
        }}
      >
        <div className="z-20 flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-4xl px-2 mt-8 sm:mt-12 md:mt-16">
          <motion.h1
            className="text-white text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold sm:font-extrabold leading-tight sm:leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Find Trusted{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent block xs:inline mt-1 xs:mt-0">
              Professionals
            </span>{" "}
            Near You
          </motion.h1>

          <motion.h2
            className="text-gray-200 text-sm xs:text-base sm:text-lg md:text-xl font-normal leading-relaxed sm:leading-relaxed max-w-3xl mx-auto px-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Connect with skilled local service providers for all your needs,
            right in your community.
          </motion.h2>
        </div>

        <motion.div
          className="z-20 w-full max-w-4xl mt-4 sm:mt-6 md:mt-8 px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Enhanced Search Container */}
          <div className="backdrop-blur-md bg-white/95 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg sm:shadow-xl border border-white/20 overflow-hidden">
            {/* Main Search Row */}
            <div className="p-3 xs:p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-3 xs:gap-4">
                {/* Search Input Section */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 xs:pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-600 group-focus-within:scale-110 transition-transform" />
                  </div>
                  <input
                    className="w-full pl-10 xs:pl-12 pr-4 py-3 xs:py-4 bg-gray-50 border border-gray-200 rounded-xl xs:rounded-2xl outline-none text-gray-800 placeholder-gray-500 text-sm xs:text-base font-medium focus:border-emerald-500 focus:bg-white transition-all duration-300"
                    placeholder="What service do you need?..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                {/* Location Selectors Section */}
                <div className="flex flex-col sm:flex-row gap-2 xs:gap-3">
                  {/* Country Selector */}
                  <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 xs:pl-4 flex items-center pointer-events-none">
                      <Globe className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-600" />
                    </div>
                    <select
                      className="w-full pl-10 xs:pl-12 pr-8 xs:pr-10 py-3 xs:py-4 bg-gray-50 border border-gray-200 rounded-xl xs:rounded-2xl text-gray-800 text-sm xs:text-base font-medium cursor-pointer outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1rem",
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
                  <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 xs:pl-4 flex items-center pointer-events-none">
                      <MapPin className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-600" />
                    </div>
                    <select
                      className="w-full pl-10 xs:pl-12 pr-8 xs:pr-10 py-3 xs:py-4 bg-gray-50 border border-gray-200 rounded-xl xs:rounded-2xl text-gray-800 text-sm xs:text-base font-medium cursor-pointer outline-none focus:border-emerald-500 focus:bg-white transition-all duration-300 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1rem",
                      }}
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                    >
                      {selectedCountry.subdivisions.map(
                        (subdivision, index) => (
                          <option key={index} value={subdivision}>
                            {subdivision}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="mt-2 xs:mt-3">
                  <motion.button
                    className="w-full flex items-center justify-center gap-2 xs:gap-3 px-5 xs:px-6 py-3 xs:py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 text-white text-sm xs:text-base font-semibold rounded-xl xs:rounded-2xl shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60 transition-all duration-300 group"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSearch}
                  >
                    <Search className="w-4 h-4 xs:w-5 xs:h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="truncate">Search Now</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Current Selection Display Bar */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-4 xs:px-6 py-2 xs:py-3 border-t border-emerald-100">
              <div className="flex items-center justify-center gap-1 xs:gap-2 text-xs xs:text-sm">
                <MapPin className="w-3 h-3 xs:w-4 xs:h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-gray-700 text-center">
                  <span className="hidden xs:inline">Searching in </span>
                  <span className="font-semibold text-emerald-700">
                    {selectedLocation === selectedCountry.subdivisions[0]
                      ? selectedCountry.name
                      : `${selectedLocation}`}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Popular Services Quick Links */}
          <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 xs:gap-3">
            {["Plumbing", "Electrical", "Cleaning", "Repairs", "Painting"].map(
              (service, index) => (
                <motion.button
                  key={index}
                  className="inline-flex items-center px-3 xs:px-4 py-1.5 xs:py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-xs xs:text-sm font-medium cursor-pointer hover:bg-white/20 transition-all duration-300 border border-white/10 whitespace-nowrap"
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
          className="z-20 mt-6 xs:mt-8 sm:mt-10 md:mt-12 grid grid-cols-2 xs:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 w-full max-w-4xl px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {[
            { number: "500+", label: "Pros" },
            { number: "2.5k+", label: "Clients" },
            { number: "98%", label: "Satisfied" },
            { number: "24/7", label: "Support" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {stat.number}
              </div>
              <div className="text-xs xs:text-sm text-gray-300 mt-0.5 xs:mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Floating elements for visual interest */}
      <motion.div
        className="absolute top-12 left-4 sm:left-10 w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-emerald-400/20 z-0"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-24 right-6 sm:right-16 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white/10 z-0"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
    </div>
  );
};

export default Hero;
