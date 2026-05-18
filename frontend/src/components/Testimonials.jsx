import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Kacper „BloodMaster”",
    role: "Admin DarkRP Polska",
    rating: 5,
    text: "Migracja z poprzedniego hostingu zajęła 10 minut. Lag totalnie zniknął, gracze są zachwyceni. Pakiet Pro to game-changer.",
  },
  {
    name: "Magda Kowalczyk",
    role: "Owner – Sandbox.PL",
    rating: 5,
    text: "Wsparcie 24/7 w języku polskim to coś, czego brakowało na rynku. Pomogli mi w sobotę o 2 w nocy, kiedy DDoS uderzył w serwer.",
  },
  {
    name: "Tomek „Voltage”",
    role: "Streamer Twitch",
    rating: 5,
    text: "Mapa rp_downtown_nexus jest absolutnie najlepsza. Społeczność prosi mnie codziennie o nowe sesje na niej.",
  },
  {
    name: "Patryk W.",
    role: "Twórca modyfikacji",
    rating: 5,
    text: "Custom paczka modów dorzucona w pakiecie Pro oszczędziła mi tygodnie pracy. Wszystko spinają w jeden gotowy zestaw.",
  },
  {
    name: "Olga „Frostie”",
    role: "Server Manager",
    rating: 5,
    text: "100 graczy bez najmniejszego spadku FPS na pakiecie VIP. Konfig + addony to pełen pro-setup, polecam każdemu adminowi.",
  },
  {
    name: "Bartek M.",
    role: "Klan eSport",
    rating: 5,
    text: "Anti-DDoS zadziałał perfekcyjnie podczas turnieju. Konkurencja próbowała nas wyłączyć – nie udało im się ani razu.",
  },
];

export default function Testimonials() {
  return (
    <section
      id="opinie"
      data-testid="testimonials-section"
      className="relative py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="nx-divider absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-14 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56] mb-4">
            Opinie społeczności
          </p>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
            Co mówią{" "}
            <span className="nx-gradient-text">o nas gracze</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="nx-card rounded-xl p-7 relative"
              data-testid={`testimonial-${i}`}
            >
              <Quote className="w-8 h-8 text-[#B026FF]/40 mb-4" />
              <p className="text-[#C9B9DD] text-sm sm:text-base leading-relaxed mb-6">
                "{t.text}"
              </p>
              <div className="flex items-center justify-between border-t border-[#B026FF]/15 pt-4">
                <div>
                  <p className="font-display font-bold text-sm text-white">{t.name}</p>
                  <p className="text-xs text-[#755D8D]">{t.role}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-[#FF1E56] text-[#FF1E56]" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
