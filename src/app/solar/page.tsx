import { getQuickSolarEstimate, getFeaturedSolarSpecialists, getSolarVertical } from "@/app/actions/solar";
import { Sun, Battery, Zap, Shield, Calculator, Users, ArrowRight, CheckCircle, Leaf } from "lucide-react";
import Link from "next/link";

export default async function SolarLandingPage() {
  const verticalResult = await getSolarVertical();
  const specialistsResult = await getFeaturedSolarSpecialists(6);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full mb-6 font-medium">
              <Sun className="h-5 w-5" />
              JustInTime Solar
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Power Your Home with 
              <span className="text-amber-600"> Kenya's Best</span> Solar Pros
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Government-verified solar installers. Premium quality systems. 
              Save up to 90% on your electricity bills.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/solar/estimate"
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Calculator className="h-5 w-5" />
                Get Free Quote
              </Link>
              <Link
                href="/solar/installers"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all border-2 border-gray-200"
              >
                <Users className="h-5 w-5" />
                Browse Installers
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 mt-10">
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span>Verified Installers</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>5-Year Warranty</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Leaf className="h-5 w-5 text-emerald-600" />
                <span>EPRA Certified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Estimate Calculator */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                How Much Could You Save?
              </h2>
              <p className="text-amber-100">
                Enter your monthly electricity bill to get an instant estimate
              </p>
            </div>

            <form action={async (formData: FormData) => {
              "use server";
              // This would redirect to full estimate page
            }} className="flex flex-col md:flex-row items-center gap-4 max-w-xl mx-auto">
              <div className="relative flex-1 w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  KES
                </span>
                <input
                  type="number"
                  name="monthlyBill"
                  placeholder="15,000"
                  className="w-full px-4 pl-14 py-4 rounded-xl text-lg font-medium focus:ring-4 focus:ring-white/30"
                />
              </div>
              <Link
                href="/solar/estimate"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Calculate
                <ArrowRight className="h-5 w-5" />
              </Link>
            </form>

            <div className="grid grid-cols-3 gap-6 mt-10 text-center text-white">
              <div>
                <p className="text-3xl font-bold">5kW</p>
                <p className="text-amber-100 text-sm">Avg System Size</p>
              </div>
              <div>
                <p className="text-3xl font-bold">KES 450K</p>
                <p className="text-amber-100 text-sm">Average Cost</p>
              </div>
              <div>
                <p className="text-3xl font-bold">3.5 yrs</p>
                <p className="text-amber-100 text-sm">Avg Payback</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Go Solar */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Go Solar in Kenya?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              With year-round sunshine and rising electricity costs, there's never been a better time
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "Save 90%", desc: "On your monthly electricity bills", color: "bg-amber-100 text-amber-600" },
              { icon: Shield, title: "25-Year Life", desc: "Premium panels with long warranties", color: "bg-blue-100 text-blue-600" },
              { icon: Battery, title: "Power Backup", desc: "Never be affected by blackouts", color: "bg-purple-100 text-purple-600" },
              { icon: Leaf, title: "Go Green", desc: "Reduce your carbon footprint", color: "bg-emerald-100 text-emerald-600" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
                <div className={`h-12 w-12 rounded-lg ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Installers */}
      {specialistsResult.success && specialistsResult.specialists && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Top Solar Installers
                </h2>
                <p className="text-gray-600">
                  Government-verified professionals ready to power your home
                </p>
              </div>
              <Link
                href="/solar/installers"
                className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {specialistsResult.specialists.map((specialist: any) => (
                <div key={specialist.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-full bg-amber-100 overflow-hidden">
                        {specialist.user.image ? (
                          <img src={specialist.user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-amber-600 font-bold text-xl">
                            {specialist.user.name?.charAt(0) || '☀️'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{specialist.user.name}</h3>
                        <p className="text-sm text-gray-500">{specialist.user.profile?.location || 'Kenya'}</p>
                      </div>
                      {specialist.isVerified && (
                        <div className="ml-auto bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                          ✓ Verified
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {specialist.averageRating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{specialist.projectsCompleted} projects</span>
                      <span>•</span>
                      <span>{specialist.experienceYears}+ years</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {specialist.specializations?.slice(0, 3).map((spec: string, idx: number) => (
                        <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                          {spec}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/profile/${specialist.user.id}`}
                      className="block w-full py-2 text-center bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <Sun className="h-16 w-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Go Solar?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Get a free, no-obligation quote from Kenya's best solar installers. 
            Start saving on your electricity bills today.
          </p>
          <Link
            href="/solar/estimate"
            className="inline-flex items-center gap-2 px-10 py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 transition-all"
          >
            Get Your Free Quote
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
