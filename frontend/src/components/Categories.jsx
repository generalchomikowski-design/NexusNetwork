import React from "react";
import { motion } from "framer-motion";
import { Server, Package, Map, ArrowRight, Check } from "lucide-react";

const HOSTING_IMG =
  "https://static.prod-images.emergentagent.com/jobs/a6c22810-5978-4df2-9cc1-acf3c498eedb/images/49aaf289ba6f9a0dc74f2d6b5f7607705732c145260b32582285944dba358482.png";
const ADDONS_IMG =
  "https://static.prod-images.emergentagent.com/jobs/a6c22810-5978-4df2-9cc1-acf3c498eedb/images/100051057b670e872a4ac5d0e3507be110cdccf7ac9dc4c0f92e37ee10a2933b.png";
const MAPS_IMG =
  "https://static.prod-images.emergentagent.com/jobs/a6c22810-5978-4df2-9cc1-acf3c498eedb/images/cda53c9ce0f21fc0bc1faae2d0be4cd1ac78411878e5f2fe2d26d2acfcb67657.png";

const categories = [
  {
    id: "hosting",
    label: "Hosting",
    overline: "Kategoria 01",
    icon: Server,
    image: HOSTING_IMG,
    title: "Hosting który nie zwolni",
    subtitle: "Niezawodne maszyny zoptymalizowane pod Garry's Mod",
    bullets: [
      "Procesory o wysokim taktowaniu 3.0+ GHz",
      "Pamięć DDR5 i dyski NVMe SSD",
      "Ochrona Anti-DDoS 1 Tbps w cenie",
      "Lokalizacja serwerów w Polsce",
      "Panel WebUI z dostępem do plików",
    ],
  },
  {
    id: "addony",
    label: "Addony",
    overline: "Kategoria 02",
    icon: Package,
    image: ADDONS_IMG,
    title: "Addony tworzące przewagę",
    subtitle: "Autorskie skrypty i modyfikacje gotowe do wdrożenia",
    bullets: [
      "Sprawdzone pakiety DarkRP / Sandbox / TTT",
      "Custom skrypty oparte o najlepsze praktyki",
      "Pełne wsparcie konfiguracji",
      "Cykliczne aktualizacje",
      "Instalacja jednym kliknięciem",
    ],
  },
  {
    id: "mapy",
    label: "Mapy",
    overline: "Kategoria 03",
    icon: Map,
    image: MAPS_IMG,
    title: "Mapy stworzone przez graczy",
    subtitle: "Autorskie, zoptymalizowane mapy z myślą o roleplay",
    bullets: [
      "Optymalizacja pod 200+ graczy",
      "Wysokiej jakości textury",
      "Strefy biznesowe i mieszkalne",
      "Dynamiczne oświetlenie HD",
      "Wsparcie wielu trybów gry",
    ],
  },
];

export default function Categories() {
  return (
    <div className="relative">
      {categories.map((cat, idx) => (
        <Category key={cat.id} category={cat} reverse={idx % 2 === 1} />
      ))}
    </div>
  );
}

function Category({ category, reverse }) {
  const Icon = category.icon;
  const scrollToPackages = () => {
    const el = document.getElementById("pakiety");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id={category.id}
      data-testid={`category-${category.id}`}
      className="relative py-24 sm:py-32 px-6 lg:px-8 overflow-hidden"
    >
      <div className="nx-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div
          className={`grid lg:grid-cols-12 gap-12 items-center ${
            reverse ? "lg:[&>div:first-child]:order-2" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0, x: reverse ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/15 to-[#B026FF]/15 border border-[#B026FF]/40 items-center justify-center">
                <Icon className="w-5 h-5 text-[#FF1E56]" />
              </span>
              <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56]">
                {category.overline}
              </span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
              {category.title}
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[#A68CC2] leading-relaxed">
              {category.subtitle}
            </p>
            <ul className="mt-8 space-y-3">
              {category.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm sm:text-base text-[#C9B9DD]"
                >
                  <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[#FF1E56]/10 border border-[#FF1E56]/40 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#FF1E56]" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={scrollToPackages}
              className="mt-10 nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2"
              data-testid={`category-cta-${category.id}`}
            >
              Zobacz pakiety
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-[#B026FF]/30 nx-glow-purple">
              <img
                src={category.image}
                alt={category.label}
                className="w-full h-[300px] sm:h-[420px] lg:h-[480px] object-cover"
                data-testid={`category-image-${category.id}`}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0014] via-[#0A0014]/20 to-transparent" />
              <div className="absolute top-5 right-5 flex items-center gap-2 backdrop-blur-md bg-[#0A0014]/60 border border-[#B026FF]/30 px-3 py-1.5 rounded-md">
                <span className="w-2 h-2 rounded-full bg-[#00FF7F] nx-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Aktywne
                </span>
              </div>
              <div className="absolute bottom-5 left-5">
                <span className="font-display font-black text-4xl sm:text-5xl text-white drop-shadow-lg">
                  {category.label}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
