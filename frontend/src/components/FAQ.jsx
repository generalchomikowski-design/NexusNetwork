import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Jak szybko otrzymam dostęp do serwera po zakupie?",
    a: "Po opłaceniu zamówienia przez Stripe Twój serwer jest automatycznie wdrażany w mniej niż 2 minuty. Dane dostępowe wysyłamy na podany adres email.",
  },
  {
    q: "Czy mogę zmienić pakiet w trakcie trwania abonamentu?",
    a: "Tak, możesz w każdej chwili przejść na wyższy pakiet hostingu z panelu klienta. Różnica w cenie jest naliczana proporcjonalnie do pozostałego okresu.",
  },
  {
    q: "Czy oferujecie zwroty?",
    a: "Tak. Jeśli z jakiegokolwiek powodu nie jesteś zadowolony, w ciągu 7 dni od zakupu zwracamy 100% kwoty bez pytań.",
  },
  {
    q: "Czy addony i mapy są kompatybilne z najnowszym Garry's Mod?",
    a: "Tak, wszystkie nasze addony i mapy są regularnie aktualizowane i testowane na najnowszej wersji Garry's Mod oraz popularnych modyfikacjach (DarkRP, TTT, Sandbox).",
  },
  {
    q: "Jakie metody płatności akceptujecie?",
    a: "Karta płatnicza (Visa, Mastercard), BLIK, Przelewy24, Apple Pay i Google Pay – wszystko bezpiecznie przez Stripe.",
  },
  {
    q: "Czy oferujecie wsparcie techniczne w języku polskim?",
    a: "Oczywiście! Nasz polski zespół wsparcia jest dostępny 24/7 na Discordzie, e-mailem i przez system ticketów.",
  },
  {
    q: "Czy mogę zainstalować własne addony?",
    a: "Tak, masz pełny dostęp do plików serwera przez FTP/SFTP i panel WebUI. Możesz instalować dowolne addony oraz mody zgodne z licencją Garry's Mod.",
  },
];

export default function FAQ() {
  return (
    <section
      id="faq"
      data-testid="faq-section"
      className="relative py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56] mb-4">
            FAQ
          </p>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
            Najczęstsze <span className="nx-gradient-text">pytania</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="nx-card rounded-xl p-2 sm:p-4"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-[#B026FF]/15"
                data-testid={`faq-item-${i}`}
              >
                <AccordionTrigger
                  className="text-left text-white font-display font-semibold hover:text-[#FF1E56] hover:no-underline px-4 py-5"
                  data-testid={`faq-trigger-${i}`}
                >
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[#A68CC2] leading-relaxed px-4 pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
