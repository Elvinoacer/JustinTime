"use client";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

const AboutPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-10 sm:py-16 lg:py-20 xl:py-32 overflow-hidden bg-gray-900">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2084&q=80"
              alt="Team working together"
              fill
              className="object-cover opacity-20"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.h1
              className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 sm:mb-6 leading-snug sm:leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Empowering <span className="text-emerald-400">Connections</span>,
              <br className="hidden xs:block" />
              Building Trust
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              JustInTime is more than just a platform; it's a community where
              skilled professionals and clients come together to get things
              done.
            </motion.p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-50px" }}
                className="order-2 lg:order-1 space-y-8 sm:space-y-10"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Our Mission
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed sm:leading-loose">
                    To revolutionize the service industry by providing a
                    seamless, secure, and efficient platform for connecting
                    clients with trusted professionals. We believe in empowering
                    individuals to grow their businesses and helping clients
                    find the best solutions for their needs.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Our Vision
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed sm:leading-loose">
                    To be the leading global marketplace for services, known for
                    quality, reliability, and innovation. We envision a world
                    where finding the right help is just a click away.
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="relative h-[280px] xs:h-[320px] sm:h-[380px] md:h-[450px] lg:h-[500px] rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl order-1 lg:order-2"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Vision"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats - 2 Columns on Mobile */}
        <section className="py-12 sm:py-16 bg-emerald-600 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 text-center">
              {[
                { number: "10k+", label: "Active Users" },
                { number: "5k+", label: "Professionals" },
                { number: "50k+", label: "Jobs Completed" },
                { number: "4.9", label: "Average Rating" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="p-3 sm:p-4 lg:p-6 bg-emerald-700/30 rounded-lg sm:rounded-xl backdrop-blur-sm"
                >
                  <div className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 leading-tight">
                    {stat.number}
                  </div>
                  <div className="text-emerald-100 font-medium text-xs xs:text-sm sm:text-base">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section - 2 Columns on Mobile */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
          <div className="container mx-auto px-3 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14 lg:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Meet Our Team
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
                The passionate individuals behind JustInTime dedicated to your
                success.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6 lg:gap-8 max-w-md mx-auto">
              {[
                {
                  name: "Elvin Juma",
                  role: "Founder & CEO",
                  image: "/images/Elvin-Profile.png",
                  bio: "Full-stack developer and entrepreneur passionate about building innovative solutions that connect people and transform businesses.",
                  portfolio: "https://elvin-juma-portfolio.vercel.app",
                },
              ].map((member, index) => (
                <Link
                  key={index}
                  href={member.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <motion.div
                    className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:translate-y-[-8px] border border-gray-100 hover:border-emerald-500"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true, margin: "-50px" }}
                  >
                    <div className="relative h-64 sm:h-72 md:h-80 lg:h-96">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-5 sm:p-6 lg:p-7 text-center">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {member.name}
                      </h3>
                      <p className="text-emerald-600 font-bold text-sm sm:text-base md:text-lg mb-4">
                        {member.role}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                        {member.bio}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm group-hover:text-emerald-700">
                        <span>View Portfolio</span>
                        <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section - 2 Columns on Mobile */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14 lg:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Our Values
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-0">
                The principles that guide everything we do at JustInTime.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {[
                {
                  title: "Trust",
                  description: "Building reliable connections",
                  icon: "🤝",
                },
                {
                  title: "Quality",
                  description: "Excellence in every service",
                  icon: "⭐",
                },
                {
                  title: "Innovation",
                  description: "Always improving",
                  icon: "💡",
                },
                {
                  title: "Community",
                  description: "Growing together",
                  icon: "🌱",
                },
              ].map((value, index) => (
                <motion.div
                  key={index}
                  className="text-center p-4 sm:p-5 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-emerald-50 transition-colors duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3">
                    {value.icon}
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                    {value.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-tight">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6 leading-tight">
              Ready to Join Our Community?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
              Whether you're looking for work or need a service, we have you
              covered.
            </p>
            <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center items-stretch xs:items-center max-w-md mx-auto xs:max-w-none">
              <Link
                href="/auth/signup"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base md:text-lg transition-all duration-300 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:scale-105 inline-flex items-center justify-center flex-1 xs:flex-none"
              >
                Get Started Free
              </Link>
              <Link
                href="/contact"
                className="bg-white border-2 border-gray-300 hover:border-emerald-600 hover:text-emerald-600 text-gray-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base md:text-lg transition-all duration-300 hover:scale-105 inline-flex items-center justify-center flex-1 xs:flex-none"
              >
                Contact Us
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">
              No credit card required • Free to join • Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
