import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Loader2, Server, Package as PackageIcon, Map, MessageSquare, Ticket, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { api, formatPLN } from "@/lib/api";

const CATEGORY_LABELS = {
  hosting: { label: "Hosting", icon: Server },
  addons: { label: "Addony", icon: PackageIcon },
  maps: { label: "Mapy", icon: Map },
};

const DISCORD_INVITE = "https://discord.gg/qBxNmfcMFd";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hosting");
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    setDialogOpen(true);
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
            Basic, Normal i Pro. Aby zamówić pakiet,{" "}
            <span className="text-white font-semibold">stwórz ticketa</span> na
            naszym Discordzie.
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
          className="bg-[#150029] border-[#B026FF]/30 text-white sm:max-w-md"
          data-testid="buy-dialog"
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex w-11 h-11 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center">
                <Ticket className="w-5 h-5 text-[#FF1E56]" />
              </span>
              <DialogTitle className="font-display text-2xl">
                Stwórz ticketa
              </DialogTitle>
            </div>
            <DialogDescription className="text-[#A68CC2] leading-relaxed pt-2">
              {selected ? (
                <>
                  Aby zamówić pakiet{" "}
                  <span className="text-white font-semibold">{selected.name}</span>
                  {" "}({formatPLN(selected.price)}), dołącz do naszego serwera
                  Discord i stwórz ticketa w kanale{" "}
                  <span className="text-white font-semibold">#ticket</span>.
                  Nasz zespół odpowie w ciągu kilku minut i poprowadzi Cię przez
                  zamówienie krok po kroku.
                </>
              ) : (
                <>
                  Dołącz do naszego serwera Discord i stwórz ticketa, aby zamówić
                  wybrany pakiet.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 nx-card rounded-lg p-4 flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-[#FF1E56] flex-shrink-0" />
            <div className="text-sm">
              <p className="text-xs uppercase tracking-wider text-[#755D8D]">Discord</p>
              <p className="font-medium text-white break-all">discord.gg/qBxNmfcMFd</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="nx-btn-outline px-5 py-2.5 rounded-md text-sm"
              data-testid="buy-dialog-cancel"
            >
              Anuluj
            </button>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDialogOpen(false)}
              className="nx-btn-primary px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2"
              data-testid="buy-dialog-confirm"
            >
              <MessageSquare className="w-4 h-4" />
              Przejdź na Discord
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </DialogFooter>
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
