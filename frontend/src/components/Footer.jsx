import React from "react";
import { Link } from "react-router-dom";
import { Hexagon, Github, MessageSquare, Twitter, Youtube } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { id: "hosting", label: "Hosting" },
  { id: "addony", label: "Addony" },
  { id: "mapy", label: "Mapy" },
  { id: "pakiety", label: "Pakiety" },
  { id: "faq", label: "FAQ" },
  { id: "kontakt", label: "Kontakt" },
];

const legal = [
  { label: "Regulamin", href: "#" },
  { label: "Polityka prywatności", href: "#" },
  { label: "Zwroty", href: "#" },
];

export default function Footer() {
  const { user } = useAuth();
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      id="footer"
      data-testid="site-footer"
      className="relative border-t border-[#B026FF]/20 bg-[#0A0014] pt-16 pb-8 px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative inline-flex items-center justify-center w-9 h-9">
                <Hexagon className="w-9 h-9 text-[#B026FF]" strokeWidth={1.5} />
                <span className="absolute font-display font-black text-[#FF1E56] text-sm">N</span>
              </span>
              <span className="font-display font-black text-lg">
                Nexus<span className="nx-gradient-text">.Network</span>
              </span>
            </div>
            <p className="text-sm text-[#A68CC2] leading-relaxed max-w-md">
              Polski hosting, autorskie addony i mapy do Garry's Mod.
              Buduj swoją społeczność z liderem rynku.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: MessageSquare, label: "Discord" },
                { Icon: Twitter, label: "Twitter" },
                { Icon: Youtube, label: "YouTube" },
                { Icon: Github, label: "GitHub" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  data-testid={`footer-social-${label.toLowerCase()}`}
                  className="w-9 h-9 rounded-md border border-[#B026FF]/30 flex items-center justify-center text-[#A68CC2] hover:text-white hover:border-[#FF1E56] hover:bg-[#FF1E56]/10 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#FF1E56] mb-4">
              Nawigacja
            </p>
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => scrollTo(l.id)}
                    className="text-sm text-[#A68CC2] hover:text-white transition-colors"
                    data-testid={`footer-link-${l.id}`}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#FF1E56] mb-4">
              Prawne
            </p>
            <ul className="space-y-2.5">
              {legal.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-[#A68CC2] hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {user?.is_admin && (
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#FF1E56] mb-4">
                Konto
              </p>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    to="/admin"
                    className="text-sm text-[#A68CC2] hover:text-white transition-colors"
                    data-testid="footer-admin-link"
                  >
                    Panel admina
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="nx-divider mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[#755D8D]">
            © {new Date().getFullYear()} Nexus Network. Wszystkie prawa zastrzeżone.
          </p>
          <p className="text-xs text-[#755D8D]">
            Garry's Mod jest znakiem towarowym należącym do Facepunch Studios.
            Nexus Network nie jest powiązany z Facepunch Studios.
          </p>
        </div>
      </div>
    </footer>
  );
}
