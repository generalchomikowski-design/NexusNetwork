import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Mail, MessageSquare, Ticket as TicketIcon, AlertCircle, ChevronDown, ChevronUp, Reply, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";

const PRIORITY_LABEL = {
  low: { label: "Niski", color: "text-[#A68CC2] border-[#A68CC2]/30 bg-[#A68CC2]/10" },
  medium: { label: "Średni", color: "text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/10" },
  high: { label: "Wysoki", color: "text-[#FF1E56] border-[#FF1E56]/40 bg-[#FF1E56]/10" },
};

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({ subject: "", message: "", priority: "medium" });
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadMine = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get("/tickets/mine");
      setTickets(res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (user) loadMine();
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) {
      toast.error("Uzupełnij temat i wiadomość");
      return;
    }
    setLoading(true);
    try {
      await api.post("/tickets", form);
      toast.success("Ticket utworzony");
      setForm({ subject: "", message: "", priority: "medium" });
      loadMine();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Błąd tworzenia ticketu");
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
              Tickets / Kontakt
            </p>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tighter text-white">
              Masz pytanie? <br />
              <span className="nx-gradient-text">Otwórz ticket.</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-[#A68CC2] leading-relaxed">
              Każde zapytanie tworzy ticket z priorytetem. Nasz zespół odpowiada na
              wiadomości w panelu klienta — sprawdzaj poniżej swoje zgłoszenia
              i odpowiadaj bezpośrednio w wątku.
            </p>

            <div className="mt-10 space-y-4">
              <ContactItem icon={Mail} label="Email" value="nexus.network.wspolpraca@gmail.com" href="mailto:nexus.network.wspolpraca@gmail.com" />
              <ContactItem icon={MessageSquare} label="Discord" value="discord.gg/q6NuQTftDh" href="https://discord.gg/q6NuQTftDh" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-8"
          >
            <form
              onSubmit={submit}
              className="nx-card rounded-xl p-6 sm:p-8 space-y-5"
              data-testid="ticket-form"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center">
                  <TicketIcon className="w-4 h-4 text-[#FF1E56]" />
                </span>
                <h3 className="font-display font-bold text-xl text-white">
                  Nowy ticket
                </h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-subject" className="text-[#C9B9DD]">
                  Temat *
                </Label>
                <Input
                  id="t-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                  placeholder="Krótki temat sprawy"
                  required
                  data-testid="ticket-subject-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-priority" className="text-[#C9B9DD]">
                  Priorytet
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger
                    id="t-priority"
                    className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                    data-testid="ticket-priority-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#150029] border-[#B026FF]/30 text-white">
                    <SelectItem value="low">Niski</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-message" className="text-[#C9B9DD]">
                  Wiadomość *
                </Label>
                <Textarea
                  id="t-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[140px]"
                  placeholder="Opisz dokładnie swoją sprawę..."
                  required
                  data-testid="ticket-message-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                data-testid="ticket-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Utwórz ticket
                  </>
                )}
              </button>
            </form>

            {/* My tickets */}
            <div className="nx-card rounded-xl p-6 sm:p-8" data-testid="my-tickets">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-[#FF1E56]" />
                </span>
                <h3 className="font-display font-bold text-xl text-white">
                  Moje tickets ({tickets.length})
                </h3>
              </div>
              {loadingTickets ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-[#FF1E56] animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-[#A68CC2]">Nie masz jeszcze ticketów.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <TicketRow key={t.id} ticket={t} onReplied={loadMine} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TicketRow({ ticket, onReplied }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const priority = PRIORITY_LABEL[ticket.priority] || PRIORITY_LABEL.medium;

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${ticket.id}/reply`, { text: reply.trim() });
      setReply("");
      toast.success("Odpowiedź wysłana");
      onReplied();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd wysyłania");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-[#B026FF]/20 rounded-lg overflow-hidden" data-testid={`ticket-row-${ticket.id}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#B026FF]/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${priority.color}`}>
            {priority.label}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
            <p className="text-xs text-[#755D8D]">
              {ticket.messages.length} wiadomości · {ticket.status === "closed" ? "Zamknięty" : "Otwarty"} ·{" "}
              {ticket.updated_at?.slice(0, 16).replace("T", " ")}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#A68CC2] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#A68CC2] flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-[#B026FF]/15 p-4 space-y-3">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-md ${
                m.author_role === "admin"
                  ? "bg-[#FF1E56]/10 border border-[#FF1E56]/30"
                  : "bg-[#150029]/60 border border-[#B026FF]/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${m.author_role === "admin" ? "text-[#FF1E56]" : "text-[#B026FF]"}`}>
                  {m.author_role === "admin" ? "Admin" : "Ty"} · {m.author_name}
                </span>
                <span className="text-[10px] text-[#755D8D]">
                  {m.created_at?.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <p className="text-sm text-[#C9B9DD] whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          ))}
          {ticket.status !== "closed" ? (
            <div className="pt-2 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Napisz odpowiedź..."
                className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[90px]"
                data-testid={`ticket-reply-input-${ticket.id}`}
              />
              <button
                onClick={send}
                disabled={sending || !reply.trim()}
                className="nx-btn-primary px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                data-testid={`ticket-reply-submit-${ticket.id}`}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                Wyślij odpowiedź
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#755D8D] inline-flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-[#00FF7F]" />
              Ticket został zamknięty przez admina.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, href }) {
  const content = (
    <>
      <span className="w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/15 to-[#B026FF]/15 border border-[#B026FF]/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#FF1E56]" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wider text-[#755D8D]">{label}</p>
        <p className="text-sm sm:text-base font-medium text-white break-all">{value}</p>
      </div>
    </>
  );
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-4 nx-card rounded-lg px-5 py-4 hover:border-[#FF1E56]/50 transition-colors"
      data-testid={`contact-link-${label.toLowerCase()}`}
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-4 nx-card rounded-lg px-5 py-4">{content}</div>
  );
}
