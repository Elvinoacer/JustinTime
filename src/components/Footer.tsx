"use client";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 text-center md:text-left">
          {/* Brand Section */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center md:justify-start gap-3 text-white mb-5">
              <span className="material-symbols-outlined text-4xl text-emerald-400">
                hub
              </span>
              <h2 className="text-2xl font-bold leading-tight tracking-tight bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                JustInTime
              </h2>
            </div>
            <p className="text-gray-300 mt-4 text-base leading-relaxed max-w-md mx-auto md:mx-0">
              Connecting you with the best local service providers in Kenya,
              just when you need them most. Quality service at your fingertips.
            </p>

            {/* Newsletter Subscription */}
            <div className="mt-6">
              <h4 className="text-gray-200 font-medium mb-3">Stay Updated</h4>
              <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto md:mx-0">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {[
                "About Us",
                "Contact",
                "Privacy Policy",
                "Terms of Service",
                "FAQ",
                "Blog",
              ].map((item, index) => (
                <li key={index}>
                  <a
                    className="text-gray-300 hover:text-emerald-400 text-base transition-colors duration-300 flex items-center justify-center md:justify-start group"
                    href="#"
                  >
                    <span className="mr-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      •
                    </span>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Services
            </h3>
            <ul className="space-y-3">
              {[
                "Plumbing",
                "Electrical",
                "Cleaning",
                "Carpentry",
                "Painting",
                "More Services...",
              ].map((service, index) => (
                <li key={index}>
                  <a
                    className="text-gray-300 hover:text-emerald-400 text-base transition-colors duration-300 flex items-center justify-center md:justify-start group"
                    href="#"
                  >
                    <span className="mr-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      •
                    </span>
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Connect With Us
            </h3>

            {/* Contact Info */}
            <div className="mb-6">
              <div className="flex items-center justify-center md:justify-start text-gray-300 mb-2">
                <span className="material-symbols-outlined text-emerald-500 mr-2 text-lg">
                  mail
                </span>
                <span>support@justintime.co.ke</span>
              </div>
              <div className="flex items-center justify-center md:justify-start text-gray-300">
                <span className="material-symbols-outlined text-emerald-500 mr-2 text-lg">
                  call
                </span>
                <span>+254 700 123 456</span>
              </div>
            </div>

            {/* App Download Badges */}
            <div className="mt-6">
              <h4 className="text-gray-200 font-medium mb-3 text-center md:text-left">
                Get Our App
              </h4>
              <div className="flex flex-col sm:flex-row gap-2 justify-center md:justify-start">
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-xs transition-colors duration-300 flex items-center justify-center">
                  <span className="material-symbols-outlined mr-1">
                    android
                  </span>
                  Google Play
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-xs transition-colors duration-300 flex items-center justify-center">
                  <span className="material-symbols-outlined mr-1">
                    phone_iphone
                  </span>
                  App Store
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.hr
          className="my-10 border-gray-700"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
          style={{ transformOrigin: "left" }}
          viewport={{ once: true }}
        />

        <motion.div
          className="text-center text-gray-400 text-sm flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p>© 2024 JustInTime. All rights reserved.</p>
          <div className="flex gap-5 mt-3 md:mt-0">
            <a
              href="#"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Cookie Policy
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
