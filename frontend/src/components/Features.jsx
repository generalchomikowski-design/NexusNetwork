import React from "react";
import { motion } from "framer-motion";
import { Shield, Zap, HeadphonesIcon, Cpu, Lock, Globe2, Code2, Wrench } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Anti-DDoS 1 Tbps",
    desc: "Profesjonalna ochrona przed atakami. Twój serwer pozostaje online.",
  },
  {
    icon: Zap,
    title: "DDR5 + NVMe SSD",
    desc: "Najszybsze możliwe komponenty. Minimalny lag, maksymalna płynność.",
  },
  {
    icon: HeadphonesIcon,
    title: "Wsparcie 24/7 PL",
    desc: "Nasz polski zespół jest dostępny zawsze – Discord, ticket, telefon.",
  },
  {
    icon: Cpu,
    title: "Wydajne CPU 3.0+ GHz",
    desc: "Wysokie taktowanie procesorów – idealne dla DarkRP i innych modów.",
  },
  {
    icon: Lock,
    title: "Backupy co 6h",
    desc: "Automatyczne kopie zapasowe Twojego serwera. Nigdy nic nie tracisz.",
  },
  {
    icon: Globe2,
    title: "Lokalizacja PL",
    desc: "Serwery w Polsce – minimalne pingi dla Twojej społeczności.",
  },
  {
    icon: Code2,
    title: "Autorskie skrypty",
    desc: "Dedykowane addony i modyfikacje stworzone przez nasz zespół.",
  },
  {
    icon: Wrench,
    title: "Panel zarządzania",
    desc: "Łatwy w obsłudze panel WebUI – zarządzaj serwerem z każdego miejsca.",
  },
];

export default function Features() {
  return (
    <section
      id="funkcje"
      data-testid="features-section"
      className="relative py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56] mb-4">
              Dlaczego my
            </p>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
              Wszystko czego potrzebujesz{" "}
              <span className="nx-gradient-text">w jednym miejscu</span>
            </h2>
          </div>
          <div className="lg:col-span-7 flex items-end">
            <p className="text-base sm:text-lg text-[#A68CC2] leading-relaxed">
              Nexus Network to pełna infrastruktura dla Twojego serwera Garry's Mod –
              od hostingu, przez addony, aż po unikalne mapy. Wszystko gotowe do
              uruchomienia jednym kliknięciem.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="nx-card rounded-lg p-6 group relative overflow-hidden"
              data-testid={`feature-card-${i}`}
            >
              <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <span className="inline-flex w-12 h-12 rounded-md bg-gradient-to-br from-[#FF1E56]/15 to-[#B026FF]/15 border border-[#B026FF]/30 items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#FF1E56]" />
                </span>
                <h3 className="font-display font-bold text-lg text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-[#A68CC2] leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
