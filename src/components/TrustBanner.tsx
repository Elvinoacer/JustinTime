"use client";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { MapPin, Users, Briefcase, Star } from "lucide-react";

function useAnimatedNumber(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end, duration]);

  return { count, ref };
}

const metrics = [
  { label: "Counties Covered", value: 47, suffix: "", icon: MapPin, color: "text-emerald-400" },
  { label: "Active Professionals", value: 500, suffix: "+", icon: Users, color: "text-cyan-400" },
  { label: "Services Completed", value: 10000, suffix: "+", icon: Briefcase, color: "text-amber-400" },
  { label: "Average Rating", value: 4.8, suffix: "/5", icon: Star, color: "text-yellow-400", isDecimal: true },
];

const TrustBanner = () => {
  const counters = [
    useAnimatedNumber(47, 1800),
    useAnimatedNumber(500, 2000),
    useAnimatedNumber(10000, 2400),
    useAnimatedNumber(48, 2000), // 4.8 * 10
  ];

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 md:p-10"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const counter = counters[index];
              return (
                <div key={index} className="text-center" ref={counter.ref}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${metric.color} mx-auto mb-2`} />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white tabular-nums">
                    {metric.isDecimal
                      ? (counter.count / 10).toFixed(1)
                      : counter.count >= 1000
                        ? `${(counter.count / 1000).toFixed(counter.count >= 10000 ? 0 : 1)}k`
                        : counter.count}
                    <span className="text-emerald-400">{metric.suffix}</span>
                  </div>
                  <div className="text-gray-500 text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-1">
                    {metric.label}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustBanner;
