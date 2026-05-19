import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Hexagon, LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { id: "hero", label: "Start" },
  { id: "funkcje", label: "Funkcje" },
  { id: "hosting", label: "Hosting" },
  { id: "addony", label: "Addony" },
  { id: "mapy", label: "Mapy" },
  { id: "pakiety", label: "Pakiety" },
  { id: "faq", label: "FAQ" },
  { id: "kontakt", label: "Kontakt" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-[#0A0014]/85 border-b border-[#B026FF]/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">
        <a
          href="#hero"
          onClick={(e) => handleNavClick(e, "hero")}
          className="flex items-center gap-2 group"
          data-testid="header-logo-link"
        >
          <span className="relative inline-flex items-center justify-center w-9 h-9">
            <Hexagon className="w-9 h-9 text-[#B026FF] group-hover:text-[#FF1E56] transition-colors" strokeWidth={1.5} />
            <span className="absolute font-display font-black text-[#FF1E56] text-sm">N</span>
          </span>
          <span className="font-display font-black text-lg sm:text-xl tracking-tight">
            Nexus<span className="nx-gradient-text">.Network</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-7">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleNavClick(e, item.id)}
              className="nx-nav-link text-sm font-medium text-[#A68CC2] hover:text-white transition-colors"
              data-testid={`nav-link-${item.id}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="#pakiety"
            onClick={(e) => handleNavClick(e, "pakiety")}
            className="nx-btn-primary px-5 py-2 rounded-md text-sm"
            data-testid="header-cta-button"
          >
            Kup teraz
          </a>
          {user && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#B026FF]/30 bg-[#150029]/60"
              data-testid="header-user-chip"
            >
              {user.picture ? (
                <img src={user.picture} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <UserCircle2 className="w-4 h-4 text-[#B026FF]" />
              )}
              <span className="text-xs text-[#C9B9DD] max-w-[140px] truncate">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                className="text-[#A68CC2] hover:text-[#FF1E56] transition-colors"
                title="Wyloguj"
                data-testid="header-logout-button"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <Link
            to="/admin/login"
            className="text-xs text-[#755D8D] hover:text-white transition-colors"
            data-testid="header-admin-link"
          >
            Panel
          </Link>
        </div>

        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          data-testid="mobile-menu-toggle"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0A0014]/95 backdrop-blur-xl border-t border-[#B026FF]/20"
            data-testid="mobile-menu"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className="text-base text-[#A68CC2] hover:text-white"
                  data-testid={`mobile-nav-link-${item.id}`}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#pakiety"
                onClick={(e) => handleNavClick(e, "pakiety")}
                className="nx-btn-primary px-4 py-2 rounded-md text-sm text-center mt-2"
                data-testid="mobile-cta-button"
              >
                Kup teraz
              </a>
              {user && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="nx-btn-outline px-4 py-2 rounded-md text-sm text-center inline-flex items-center justify-center gap-2"
                  data-testid="mobile-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  Wyloguj ({user.email})
                </button>
              )}
              <Link
                to="/admin/login"
                className="text-xs text-[#755D8D] hover:text-white text-center"
                data-testid="mobile-admin-link"
              >
                Panel administracyjny
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
