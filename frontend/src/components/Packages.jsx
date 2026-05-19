import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Loader2, Server, Package as PackageIcon, Map, MessageSquare, Ticket, ArrowUpRight, CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, formatPLN } from "@/lib/api";

const CATEGORY_LABELS = {
  hosting: { label: "Hosting", icon: Server },
  addons: { label: "Addony", icon: PackageIcon },
  maps: { label: "Mapy", icon: Map },
};

const DISCORD_INVITE = "https://discord.gg/qBxNmfcMFd";

const emptyForm = { customer_email: "", discord_name: "", description: "" };

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hosting");
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState("choose"); // choose | stripe-form
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/packages")
      .then((res) => setPackages(res.data || []))
      .catch(() => toast.error("Nie udało się pobrać pakietów"))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = (cat) =>
    packages
      .filter((p) => p.category === cat)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const onBuyClick = (pkg) => {
    setSelected(pkg);
    setView("choose");
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleStripeCheckout = async () => {
    if (!selected) return;
    if (!form.customer_email || !form.discord_name || !form.description) {
      toast.error("Uzupełnij wszystkie pola formularza");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/checkout/create", {
        package_id: selected.id,
        origin_url: window.location.origin,
        customer_email: form.customer_email,
        discord_name: form.discord_name,
        description: form.description,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Brak adresu Stripe");
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : "Błąd płatności";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="pakiety"
      data-testid="packages-section"
      className="relative py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56] mb-4"
          >
            Cennik
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter"
            data-testid="packages-title"
          >
            Wybierz swój <span className="nx-gradient-text">pakiet</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-5 text-base sm:text-lg text-[#A68CC2] max-w-2xl mx-auto"
          >
            Promocja <span className="text-white font-bold">-50%</span> na pakiety
            Basic, Normal i Pro. Zapłać kartą przez{" "}
            <span className="text-white font-semibold">Stripe</span> lub{" "}
            <span className="text-white font-semibold">stwórz ticketa</span> na
            Discordzie.
          </motion.p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            data-testid="packages-tabs"
            className="bg-[#150029]/60 border border-[#B026FF]/20 mx-auto flex mb-12 h-auto p-1.5 w-full max-w-md rounded-md"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, { label, icon: I }]) => (
              <TabsTrigger
                key={key}
                value={key}
                data-testid={`packages-tab-${key}`}
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF] data-[state=active]:text-white text-[#A68CC2] flex items-center gap-2 py-2.5"
              >
                <I className="w-4 h-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(CATEGORY_LABELS).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-0">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-[#FF1E56] animate-spin" />
                </div>
              ) : byCategory(cat).length === 0 ? (
                <div className="text-center py-12 text-[#A68CC2]">
                  Wkrótce dostępne pakiety w tej kategorii.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {byCategory(cat).map((pkg, i) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      index={i}
                      onBuy={() => onBuyClick(pkg)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="bg-[#150029] border-[#B026FF]/30 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto"
          data-testid="buy-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {selected ? `Zamówienie: ${selected.name}` : "Zamówienie"}
            </DialogTitle>
            <DialogDescription className="text-[#A68CC2] leading-relaxed pt-2">
              {selected ? (
                <>
                  Kwota:{" "}
                  <span className="text-white font-bold">
                    {formatPLN(selected.price)}
                  </span>
                  {view === "choose"
                    ? ". Wybierz wygodną dla Ciebie metodę płatności."
                    : ". Wypełnij dane, aby przejść do Stripe."}
                </>
              ) : (
                "Wybierz wygodną dla Ciebie metodę płatności."
              )}
            </DialogDescription>
          </DialogHeader>

          {view === "choose" && (
            <>
              <div className="nx-card rounded-lg p-5 mt-3">
                <div className="flex items-start gap-3 mb-4">
                  <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-[#FF1E56]" />
                  </span>
                  <div>
                    <p className="font-display font-bold text-white">
                      Zapłać kartą (Stripe)
                    </p>
                    <p className="text-xs text-[#A68CC2] mt-0.5">
                      Karta, BLIK, Apple Pay, Google Pay. Najpierw uzupełniasz dane
                      kontaktowe.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setView("stripe-form")}
                  className="nx-btn-primary w-full px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2"
                  data-testid="buy-dialog-stripe"
                >
                  <CreditCard className="w-4 h-4" />
                  Zapłać przez Stripe
                </button>
              </div>

              <div className="nx-card rounded-lg p-5 mt-3">
                <div className="flex items-start gap-3 mb-4">
                  <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center flex-shrink-0">
                    <Ticket className="w-4 h-4 text-[#FF1E56]" />
                  </span>
                  <div>
                    <p className="font-display font-bold text-white">
                      Stwórz ticketa na Discordzie
                    </p>
                    <p className="text-xs text-[#A68CC2] mt-0.5">
                      Dołącz do serwera i otwórz ticket w kanale{" "}
                      <span className="text-white font-semibold">#ticket</span>.
                      Nasz zespół poprowadzi Cię przez zamówienie.
                    </p>
                  </div>
                </div>
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDialogOpen(false)}
                  className="nx-btn-outline w-full px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2"
                  data-testid="buy-dialog-ticket"
                >
                  <MessageSquare className="w-4 h-4" />
                  Przejdź na Discord
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="text-sm text-[#A68CC2] hover:text-white transition-colors"
                  data-testid="buy-dialog-cancel"
                >
                  Anuluj
                </button>
              </div>
            </>
          )}

          {view === "stripe-form" && (
            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cust-email" className="text-[#C9B9DD]">
                  Email *
                </Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  placeholder="ty@example.com"
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                  required
                  data-testid="buy-form-email"
                />
                <p className="text-xs text-[#755D8D]">
                  Wyślemy tu potwierdzenie zamówienia oraz dane dostępowe.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord-name" className="text-[#C9B9DD]">
                  Nazwa Discord *
                </Label>
                <Input
                  id="discord-name"
                  value={form.discord_name}
                  onChange={(e) => setForm({ ...form, discord_name: e.target.value })}
                  placeholder="np. nick lub nick#1234"
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                  required
                  data-testid="buy-form-discord"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-desc" className="text-[#C9B9DD]">
                  Co dokładnie chcesz zamówić? *
                </Label>
                <Textarea
                  id="cust-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opisz dokładnie czego od nas oczekujesz – tryb gry (DarkRP/Sandbox/TTT), modyfikacje, nazwa serwera, dodatki, etc."
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[140px]"
                  required
                  data-testid="buy-form-description"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => setView("choose")}
                  disabled={submitting}
                  className="nx-btn-outline px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="buy-form-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Wstecz
                </button>
                <button
                  onClick={handleStripeCheckout}
                  disabled={submitting}
                  className="nx-btn-primary flex-1 px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="buy-form-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Przekierowanie...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Przejdź do Stripe
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PackageCard({ pkg, index, onBuy }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -8 }}
      className={`relative nx-card rounded-xl p-6 flex flex-col ${
        pkg.featured ? "ring-2 ring-[#FF1E56] nx-glow-red" : ""
      }`}
      data-testid={`package-card-${pkg.id}`}
    >
      {pkg.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-[#FF1E56] to-[#B026FF] px-3 py-1 rounded-sm">
          <Sparkles className="w-3 h-3" />
          Najpopularniejszy
        </span>
      )}
      {pkg.promo_label && (
        <span
          className="absolute top-4 right-4 bg-[#FF1E56] text-white text-xs font-black uppercase px-3 py-1 rounded-sm tracking-wider nx-glow-red"
          data-testid={`package-promo-${pkg.id}`}
        >
          {pkg.promo_label}
        </span>
      )}

      <h3 className="font-display font-black text-2xl text-white">{pkg.name}</h3>
      {pkg.description && (
        <p className="mt-2 text-sm text-[#A68CC2] min-h-[40px]">{pkg.description}</p>
      )}

      <div className="mt-5 flex items-baseline gap-2">
        <span
          className="font-display font-black text-4xl nx-gradient-text"
          data-testid={`package-price-${pkg.id}`}
        >
          {formatPLN(pkg.price)}
        </span>
        {pkg.old_price && (
          <span className="text-sm text-[#755D8D] line-through">
            {formatPLN(pkg.old_price)}
          </span>
        )}
      </div>
      {pkg.category === "hosting" && (
        <p className="text-xs text-[#755D8D] mt-1">/ miesiąc</p>
      )}

      <ul className="mt-6 space-y-2.5 flex-1">
        {(pkg.specs || []).map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-[#C9B9DD]">
            <Check className="w-4 h-4 text-[#FF1E56] flex-shrink-0 mt-0.5" />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onBuy}
        className={`mt-7 ${
          pkg.featured ? "nx-btn-primary" : "nx-btn-outline"
        } w-full py-3 rounded-md text-sm font-bold transition-all`}
        data-testid={`package-buy-${pkg.id}`}
      >
        Kup teraz
      </button>
    </motion.div>
  );
}
