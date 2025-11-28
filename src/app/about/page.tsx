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
        <section className="relative py-20 lg:py-32 overflow-hidden bg-gray-900">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2084&q=80"
              alt="Team working together"
              fill
              className="object-cover opacity-20"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Empowering <span className="text-emerald-400">Connections</span>,<br />
              Building Trust.
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              JustInTime is more than just a platform; it's a community where skilled professionals and clients come together to get things done.
            </motion.p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  To revolutionize the service industry by providing a seamless, secure, and efficient platform for connecting clients with trusted professionals. We believe in empowering individuals to grow their businesses and helping clients find the best solutions for their needs.
                </p>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To be the leading global marketplace for services, known for quality, reliability, and innovation. We envision a world where finding the right help is just a click away.
                </p>
              </motion.div>
              
              <motion.div
                className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Vision"
                  fill
                  className="object-cover"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-emerald-600 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
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
                  viewport={{ once: true }}
                >
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                  <div className="text-emerald-100 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                The passionate individuals behind JustInTime dedicated to your success.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {[
                { name: "Elvin", role: "Founder & CEO", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdl8N_EVL-Gd0YIY4nl4FKR_ss93wWyW11IjR5QyVYoYmfsOSt3FTmxqvfRgqDyclWYUmHlEvK9JOPtlzRv1QP3ZVtCpOMSg94B-XK0J6TaCZinPljfyg1-HPphq-z5RYR8-NJaQaX1xhZg9j4Q1g0ciXvQu5QsmlCVIPG9jjtP4q73Kqhb34OjUOvV8x1W--8nFz9rdS48U-XvreG09Atgj1gY6f_nciYxYqjslEVh2aZCu9LhI7uoFg9e8TqkjHHB4u9LqD3MEg" },
                { name: "Sarah Johnson", role: "Head of Operations", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
                { name: "Michael Chen", role: "Lead Developer", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
              ].map((member, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="relative h-80">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                    <p className="text-emerald-600 font-medium">{member.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Join Our Community?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Whether you're looking for work or need a service, we have you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/signup"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-200 inline-block"
              >
                Get Started
              </Link>
              <Link 
                href="/contact"
                className="bg-white border-2 border-gray-200 hover:border-emerald-600 hover:text-emerald-600 text-gray-700 px-8 py-3 rounded-xl font-bold text-lg transition-colors inline-block"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutPage;
