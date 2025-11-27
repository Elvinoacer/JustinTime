import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
          <div className="prose prose-emerald max-w-none text-gray-600">
            <p className="mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="mb-4">
              This Cookie Policy explains what cookies are and how we use them. You should read this policy so you can understand what type of cookies we use, or the information we collect using cookies and how that information is used.
            </p>
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">What are Cookies?</h2>
            <p className="mb-4">
              Cookies are small text files that are sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.
            </p>
            <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">How JustInTime Uses Cookies</h2>
            <p className="mb-4">
              When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes: to enable certain functions of the Service, to provide analytics, to store your preferences, to enable advertisements delivery, including behavioral advertising.
            </p>
            {/* Add more content as needed */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
