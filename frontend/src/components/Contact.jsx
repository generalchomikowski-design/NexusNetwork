import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, Loader2, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Uzupełnij wszystkie wymagane pola");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Wiadomość wysłana! Odpowiemy w 24h.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd wysyłania wiadomości");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="kontakt"
      data-testid="contact-section"
      className="relative py-24 sm:py-32 px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#FF1E56] mb-4">
              Kontakt
            </p>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
              Masz pytanie? <br />
              <span className="nx-gradient-text">Napisz do nas.</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-[#A68CC2] leading-relaxed">
              Zespół Nexus Network odpowiada na wiadomości w ciągu 24 godzin.
              W pilnych sprawach polecamy Discord lub system ticketów.
            </p>

            <div className="mt-10 space-y-4">
              <ContactItem icon={Mail} label="Email" value="kontakt@nexusnetwork.pl" />
              <ContactItem icon={MessageSquare} label="Discord" value="discord.gg/nexusnetwork" />
              <ContactItem icon={Phone} label="Telefon" value="+48 500 123 456" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <form
              onSubmit={onSubmit}
              className="nx-card rounded-xl p-6 sm:p-8 space-y-5"
              data-testid="contact-form"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#C9B9DD]">
                    Imię *
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                    placeholder="Twoje imię"
                    required
                    data-testid="contact-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#C9B9DD]">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                    placeholder="ty@example.com"
                    required
                    data-testid="contact-email-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-[#C9B9DD]">
                  Temat
                </Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                  placeholder="Pytanie dotyczące pakietu..."
                  data-testid="contact-subject-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-[#C9B9DD]">
                  Wiadomość *
                </Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[140px]"
                  placeholder="Opisz swój problem lub pytanie..."
                  required
                  data-testid="contact-message-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                data-testid="contact-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Wyślij wiadomość
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 nx-card rounded-lg px-5 py-4">
      <span className="w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/15 to-[#B026FF]/15 border border-[#B026FF]/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#FF1E56]" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wider text-[#755D8D]">{label}</p>
        <p className="text-sm sm:text-base font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
