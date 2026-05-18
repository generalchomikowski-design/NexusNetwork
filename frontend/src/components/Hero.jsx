import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Zap, Shield, Server } from "lucide-react";

const HERO_BG =
  "https://static.prod-images.emergentagent.com/jobs/a6c22810-5978-4df2-9cc1-acf3c498eedb/images/ccf0ae16f5637d91c49c8ca6def08e103199894b1e725c0d74137e9d06ab308c.png";

export default function Hero() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      data-testid="hero-section"
      className="relative min-h-screen flex items-center justify-center overflow-hidden nx-hero-bg"
    >
      {/* Decorative bg image */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 nx-grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0014] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-16 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF1E56] opacity-75 nx-pulse" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF1E56]" />
              </span>
              <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56]">
                Garry's Mod • PL Network
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-black text-5xl sm:text-7xl lg:text-7xl xl:text-8xl leading-[0.9] tracking-tighter"
              data-testid="hero-title"
            >
              <span className="block text-white nx-glitch-hover">NEXUS</span>
              <span className="block nx-gradient-text">NETWORK</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 text-lg sm:text-xl text-[#A68CC2] max-w-2xl leading-relaxed"
              data-testid="hero-subtitle"
            >
              Najszybszy hosting, autorskie addony i mapy do Garry's Mod.
              Zbuduj swój wymarzony serwer w 5 minut.{" "}
              <span className="text-white font-semibold">
                Promocja -50% na wszystkie pakiety!
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <button
                onClick={() => scrollTo("pakiety")}
                className="nx-btn-primary px-7 py-4 rounded-md text-base inline-flex items-center gap-2"
                data-testid="hero-cta-primary"
              >
                <Zap className="w-5 h-5" />
                Wybierz pakiet
              </button>
              <button
                onClick={() => scrollTo("funkcje")}
                className="nx-btn-outline px-7 py-4 rounded-md text-base inline-flex items-center gap-2"
                data-testid="hero-cta-secondary"
              >
                Dowiedz się więcej
                <ChevronDown className="w-5 h-5" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mt-12 flex flex-wrap items-center gap-6 sm:gap-10"
            >
              <Metric value="99.9%" label="Uptime" />
              <Metric value="2 min" label="Czas wdrożenia" />
              <Metric value="24/7" label="Wsparcie PL" />
              <Metric value="500+" label="Aktywnych serwerów" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-4 hidden lg:flex flex-col gap-4"
          >
            <FloatingCard icon={Server} title="Hosting" desc="DDR5 + NVMe" delay={0.5} />
            <FloatingCard icon={Shield} title="Anti-DDoS" desc="1 Tbps ochrona" delay={0.65} />
            <FloatingCard icon={Zap} title="Wdrożenie" desc="Natychmiast" delay={0.8} />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#755D8D]"
      >
        <span className="text-xs uppercase tracking-widest">Przewiń</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </motion.div>
    </section>
  );
}

function Metric({ value, label }) {
  return (
    <div className="flex flex-col" data-testid={`hero-metric-${label}`}>
      <span className="font-display font-black text-2xl sm:text-3xl text-white">{value}</span>
      <span className="text-xs uppercase tracking-wider text-[#755D8D] mt-1">{label}</span>
    </div>
  );
}

function FloatingCard({ icon: Icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="nx-card rounded-lg p-5 flex items-center gap-4"
    >
      <span className="w-11 h-11 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 flex items-center justify-center border border-[#B026FF]/30">
        <Icon className="w-5 h-5 text-[#FF1E56]" />
      </span>
      <div>
        <p className="font-display font-bold text-sm text-white">{title}</p>
        <p className="text-xs text-[#A68CC2]">{desc}</p>
      </div>
    </motion.div>
  );
}
