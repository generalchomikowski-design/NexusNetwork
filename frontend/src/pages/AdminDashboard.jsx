import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, LogOut, Plus, Edit, Trash2, Loader2, Save, X, RefreshCcw, ShieldCheck, UserPlus, Crown, Ticket as TicketIcon, Reply, Lock, Unlock, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api, formatPLN } from "@/lib/api";

const emptyForm = {
  category: "hosting",
  name: "",
  price: 0,
  old_price: "",
  promo_label: "",
  description: "",
  specs_text: "",
  featured: false,
  sort_order: 0,
  active: true,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [me, setMe] = useState({ email: "", is_super: false });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // package or null
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nx_admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    api
      .get("/admin/me")
      .then((res) => {
        setMe(res.data || { email: "", is_super: false });
        loadAll(res.data?.is_super);
      })
      .catch(() => {
        localStorage.removeItem("nx_admin_token");
        navigate("/admin/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (isSuper) => {
    setLoading(true);
    try {
      const calls = [
        api.get("/packages?active_only=false"),
        api.get("/admin/transactions"),
        api.get("/admin/tickets"),
      ];
      if (isSuper) calls.push(api.get("/admin/admins"));
      const results = await Promise.all(calls);
      setPackages(results[0].data || []);
      setTransactions(results[1].data || []);
      setTickets(results[2].data || []);
      if (isSuper && results[3]) setAdmins(results[3].data || []);
    } catch (e) {
      toast.error("Błąd ładowania danych");
    } finally {
      setLoading(false);
    }
  };

  const createAdmin = async () => {
    if (!adminForm.email || !adminForm.password) {
      toast.error("Wpisz email i hasło");
      return;
    }
    if (adminForm.password.length < 6) {
      toast.error("Hasło musi mieć co najmniej 6 znaków");
      return;
    }
    setCreatingAdmin(true);
    try {
      await api.post("/admin/admins", adminForm);
      toast.success("Administrator dodany");
      setAdminForm({ email: "", password: "" });
      const res = await api.get("/admin/admins");
      setAdmins(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd dodawania administratora");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const deleteAdmin = async (email) => {
    if (!window.confirm(`Usunąć administratora ${email}?`)) return;
    try {
      await api.delete(`/admin/admins/${encodeURIComponent(email)}`);
      toast.success("Administrator usunięty");
      const res = await api.get("/admin/admins");
      setAdmins(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd usuwania");
    }
  };

  const replyToTicket = async (ticketId, text) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/reply`, { text });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data : t)));
      toast.success("Odpowiedź wysłana");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd wysyłania");
      return false;
    }
  };

  const toggleTicketStatus = async (ticket) => {
    const next = ticket.status === "closed" ? "open" : "closed";
    try {
      const res = await api.put(`/admin/tickets/${ticket.id}/status?new_status=${next}`);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? res.data : t)));
      toast.success(next === "closed" ? "Ticket zamknięty" : "Ticket otwarty");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd");
    }
  };

  const logout = () => {
    localStorage.removeItem("nx_admin_token");
    localStorage.removeItem("nx_admin_email");
    navigate("/admin/login");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    setForm({
      category: pkg.category,
      name: pkg.name,
      price: pkg.price,
      old_price: pkg.old_price ?? "",
      promo_label: pkg.promo_label ?? "",
      description: pkg.description ?? "",
      specs_text: (pkg.specs || []).join("\n"),
      featured: pkg.featured,
      sort_order: pkg.sort_order ?? 0,
      active: pkg.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      category: form.category,
      name: form.name,
      price: parseFloat(form.price) || 0,
      old_price: form.old_price === "" ? null : parseFloat(form.old_price),
      promo_label: form.promo_label || null,
      description: form.description || null,
      specs: form.specs_text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      featured: !!form.featured,
      sort_order: parseInt(form.sort_order) || 0,
      active: !!form.active,
    };
    try {
      if (editing) {
        await api.put(`/admin/packages/${editing.id}`, payload);
        toast.success("Pakiet zaktualizowany");
      } else {
        await api.post("/admin/packages", payload);
        toast.success("Pakiet utworzony");
      }
      setDialogOpen(false);
      loadAll(me.is_super);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  const del = async (pkg) => {
    if (!window.confirm(`Usunąć pakiet "${pkg.name}"?`)) return;
    try {
      await api.delete(`/admin/packages/${pkg.id}`);
      toast.success("Pakiet usunięty");
      loadAll(me.is_super);
    } catch (e) {
      toast.error("Błąd usuwania");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0014] text-white" data-testid="admin-dashboard">
      <header className="border-b border-[#B026FF]/20 backdrop-blur-xl bg-[#0A0014]/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center w-9 h-9">
              <Hexagon className="w-9 h-9 text-[#B026FF]" strokeWidth={1.5} />
              <span className="absolute font-display font-black text-[#FF1E56] text-sm">N</span>
            </span>
            <span className="font-display font-black text-lg">
              Nexus<span className="nx-gradient-text">.Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAll(me.is_super)}
              className="nx-btn-outline px-4 py-2 rounded-md text-sm inline-flex items-center gap-2"
              data-testid="admin-refresh-button"
            >
              <RefreshCcw className="w-4 h-4" />
              Odśwież
            </button>
            <button
              onClick={logout}
              className="nx-btn-outline px-4 py-2 rounded-md text-sm inline-flex items-center gap-2"
              data-testid="admin-logout-button"
            >
              <LogOut className="w-4 h-4" />
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-black text-3xl">Panel zarządzania</h1>
            {me.email && (
              <p className="text-xs text-[#A68CC2] mt-1 inline-flex items-center gap-2">
                {me.is_super ? (
                  <>
                    <Crown className="w-3 h-3 text-[#FF1E56]" />
                    Super-admin: {me.email}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-[#B026FF]" />
                    Admin: {me.email}
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="packages">
          <TabsList className="bg-[#150029]/60 border border-[#B026FF]/20 mb-8">
            <TabsTrigger
              value="packages"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF]"
              data-testid="admin-tab-packages"
            >
              Pakiety ({packages.length})
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF]"
              data-testid="admin-tab-transactions"
            >
              Transakcje ({transactions.length})
            </TabsTrigger>
            <TabsTrigger
              value="tickets"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF]"
              data-testid="admin-tab-tickets"
            >
              <TicketIcon className="w-3.5 h-3.5 mr-1" />
              Tickets ({tickets.length})
            </TabsTrigger>
            {me.is_super && (
              <TabsTrigger
                value="admins"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF]"
                data-testid="admin-tab-admins"
              >
                <Crown className="w-3.5 h-3.5 mr-1" />
                Administratorzy ({admins.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="packages">
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreate}
                className="nx-btn-primary px-5 py-2.5 rounded-md text-sm inline-flex items-center gap-2"
                data-testid="admin-new-package-button"
              >
                <Plus className="w-4 h-4" />
                Nowy pakiet
              </button>
            </div>
            <div className="nx-card rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#FF1E56] animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#B026FF]/15 hover:bg-transparent">
                      <TableHead className="text-[#A68CC2]">Kategoria</TableHead>
                      <TableHead className="text-[#A68CC2]">Nazwa</TableHead>
                      <TableHead className="text-[#A68CC2]">Cena</TableHead>
                      <TableHead className="text-[#A68CC2]">Promo</TableHead>
                      <TableHead className="text-[#A68CC2]">Status</TableHead>
                      <TableHead className="text-[#A68CC2] text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((p) => (
                      <TableRow
                        key={p.id}
                        className="border-[#B026FF]/10 hover:bg-[#B026FF]/5"
                        data-testid={`admin-package-row-${p.id}`}
                      >
                        <TableCell>
                          <span className="text-xs uppercase tracking-wider text-[#FF1E56] font-bold">
                            {p.category}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          {p.name}
                          {p.featured && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-[#FF1E56]">
                              ★ Featured
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-white">{formatPLN(p.price)}</span>
                          {p.old_price && (
                            <span className="ml-2 text-xs text-[#755D8D] line-through">
                              {formatPLN(p.old_price)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.promo_label ? (
                            <span className="text-xs font-bold text-[#FF1E56]">
                              {p.promo_label}
                            </span>
                          ) : (
                            <span className="text-xs text-[#755D8D]">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-bold ${
                              p.active ? "text-[#00FF7F]" : "text-[#755D8D]"
                            }`}
                          >
                            {p.active ? "Aktywny" : "Wyłączony"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-2 rounded-md hover:bg-[#B026FF]/10 text-[#A68CC2] hover:text-white transition-colors"
                              data-testid={`admin-edit-${p.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => del(p)}
                              className="p-2 rounded-md hover:bg-[#FF1E56]/10 text-[#A68CC2] hover:text-[#FF1E56] transition-colors"
                              data-testid={`admin-delete-${p.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="nx-card rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#FF1E56] animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-center py-12 text-[#A68CC2]">Brak transakcji.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#B026FF]/15 hover:bg-transparent">
                      <TableHead className="text-[#A68CC2]">Pakiet</TableHead>
                      <TableHead className="text-[#A68CC2]">Email</TableHead>
                      <TableHead className="text-[#A68CC2]">Discord</TableHead>
                      <TableHead className="text-[#A68CC2]">Opis</TableHead>
                      <TableHead className="text-[#A68CC2]">Kwota</TableHead>
                      <TableHead className="text-[#A68CC2]">Status płatności</TableHead>
                      <TableHead className="text-[#A68CC2]">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow
                        key={t.id}
                        className="border-[#B026FF]/10 hover:bg-[#B026FF]/5"
                        data-testid={`admin-txn-row-${t.id}`}
                      >
                        <TableCell className="font-medium text-white">
                          {t.package_name}
                        </TableCell>
                        <TableCell className="text-[#A68CC2] text-sm">
                          {t.customer_email || "—"}
                        </TableCell>
                        <TableCell className="text-[#A68CC2] text-sm">
                          {t.discord_name || "—"}
                        </TableCell>
                        <TableCell className="text-[#A68CC2] text-xs max-w-[260px] truncate" title={t.description || ""}>
                          {t.description || "—"}
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          {formatPLN(t.amount)}
                        </TableCell>
                        <TableCell>
                          <PaymentBadge txn={t} />
                        </TableCell>
                        <TableCell className="text-[#755D8D] text-xs">
                          {t.created_at?.slice(0, 19).replace("T", " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            <div className="nx-card rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#FF1E56] animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-center py-12 text-[#A68CC2]">Brak ticketów.</p>
              ) : (
                <ul className="divide-y divide-[#B026FF]/15">
                  {tickets.map((t) => (
                    <AdminTicketRow
                      key={t.id}
                      ticket={t}
                      onReply={replyToTicket}
                      onToggleStatus={toggleTicketStatus}
                    />
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          {me.is_super && (
            <TabsContent value="admins">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="nx-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#FF1E56]" />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Dodaj administratora
                      </h3>
                      <p className="text-xs text-[#A68CC2]">
                        Nowy admin będzie mógł zarządzać pakietami i transakcjami.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#C9B9DD]">Email</Label>
                      <Input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        placeholder="nowy.admin@example.pl"
                        className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                        data-testid="admin-create-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C9B9DD]">Hasło</Label>
                      <Input
                        type="text"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        placeholder="min. 6 znaków"
                        className="bg-[#0A0014] border-[#B026FF]/30 text-white font-mono"
                        data-testid="admin-create-password"
                      />
                      <p className="text-xs text-[#755D8D]">
                        Przekaż hasło nowemu administratorowi w bezpieczny sposób –
                        Twoja platforma nie wysyła go automatycznie.
                      </p>
                    </div>
                    <button
                      onClick={createAdmin}
                      disabled={creatingAdmin}
                      className="nx-btn-primary w-full px-5 py-2.5 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      data-testid="admin-create-submit"
                    >
                      {creatingAdmin ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      Dodaj administratora
                    </button>
                  </div>
                </div>

                <div className="nx-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex w-10 h-10 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-[#FF1E56]" />
                    </span>
                    <h3 className="font-display font-bold text-lg text-white">
                      Lista administratorów ({admins.length})
                    </h3>
                  </div>
                  {admins.length === 0 ? (
                    <p className="text-sm text-[#A68CC2]">Brak administratorów.</p>
                  ) : (
                    <ul className="divide-y divide-[#B026FF]/15">
                      {admins.map((a) => (
                        <li
                          key={a.email}
                          className="flex items-center justify-between py-3"
                          data-testid={`admin-row-${a.email}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {a.role === "super" ? (
                              <Crown className="w-4 h-4 text-[#FF1E56] flex-shrink-0" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-[#B026FF] flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{a.email}</p>
                              <p className="text-xs text-[#755D8D]">
                                {a.role === "super" ? "Super-admin" : "Admin"}
                              </p>
                            </div>
                          </div>
                          {a.role !== "super" && (
                            <button
                              onClick={() => deleteAdmin(a.email)}
                              className="p-2 rounded-md hover:bg-[#FF1E56]/10 text-[#A68CC2] hover:text-[#FF1E56] transition-colors"
                              data-testid={`admin-delete-row-${a.email}`}
                              title="Usuń administratora"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="bg-[#150029] border-[#B026FF]/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="admin-package-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Edytuj pakiet" : "Nowy pakiet"}
            </DialogTitle>
            <DialogDescription className="text-[#A68CC2]">
              Wprowadź szczegóły pakietu. Zmiany są widoczne natychmiast na stronie.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Kategoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger
                  className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                  data-testid="admin-form-category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#150029] border-[#B026FF]/30 text-white">
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="addons">Addony</SelectItem>
                  <SelectItem value="maps">Mapy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Nazwa *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                data-testid="admin-form-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Cena (PLN) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                data-testid="admin-form-price"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Stara cena (opcjonalna)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.old_price}
                onChange={(e) => setForm({ ...form, old_price: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                data-testid="admin-form-old-price"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Promo label (np. -50%)</Label>
              <Input
                value={form.promo_label}
                onChange={(e) => setForm({ ...form, promo_label: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                data-testid="admin-form-promo"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#C9B9DD]">Kolejność sortowania</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white"
                data-testid="admin-form-sort"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-[#C9B9DD]">Opis</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[80px]"
                data-testid="admin-form-description"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-[#C9B9DD]">Specyfikacja (po jednej w linii)</Label>
              <Textarea
                value={form.specs_text}
                onChange={(e) => setForm({ ...form, specs_text: e.target.value })}
                className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[140px] font-mono text-sm"
                placeholder="8GB RAM&#10;120GB SSD&#10;3.0 vCore CPU"
                data-testid="admin-form-specs"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
                data-testid="admin-form-featured"
              />
              <Label className="text-[#C9B9DD] cursor-pointer">Polecany</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
                data-testid="admin-form-active"
              />
              <Label className="text-[#C9B9DD] cursor-pointer">Aktywny</Label>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="nx-btn-outline px-5 py-2 rounded-md text-sm inline-flex items-center gap-2"
              data-testid="admin-form-cancel"
            >
              <X className="w-4 h-4" />
              Anuluj
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name}
              className="nx-btn-primary px-5 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
              data-testid="admin-form-save"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editing ? "Zapisz zmiany" : "Utwórz"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PRIORITY_BADGE = {
  low: { label: "Niski", cls: "text-[#A68CC2] border-[#A68CC2]/30 bg-[#A68CC2]/10" },
  medium: { label: "Średni", cls: "text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/10" },
  high: { label: "Wysoki", cls: "text-[#FF1E56] border-[#FF1E56]/40 bg-[#FF1E56]/10" },
};

function PaymentBadge({ txn }) {
  const ps = txn.payment_status;
  const st = txn.status;
  const ageMin = txn.created_at
    ? (Date.now() - new Date(txn.created_at).getTime()) / 60000
    : 0;
  const isPaid = ps === "paid";
  const isExpired = st === "expired" || ps === "expired";
  // Heuristic: not paid AND older than 30 min → treat as cancelled/abandoned
  const isAbandoned = !isPaid && (isExpired || ageMin > 30);

  let cls = "text-[#A68CC2] border-[#A68CC2]/30 bg-[#A68CC2]/10";
  let label = "W trakcie";
  let Icon = Clock;
  if (isPaid) {
    cls = "text-[#00FF7F] border-[#00FF7F]/40 bg-[#00FF7F]/10";
    label = "Opłacono";
    Icon = CheckCircle2;
  } else if (isAbandoned) {
    cls = "text-[#FF1E56] border-[#FF1E56]/40 bg-[#FF1E56]/10";
    label = "Anulowano";
    Icon = XCircle;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function AdminTicketRow({ ticket, onReply, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const priority = PRIORITY_BADGE[ticket.priority] || PRIORITY_BADGE.medium;
  const isClosed = ticket.status === "closed";

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const ok = await onReply(ticket.id, reply.trim());
    if (ok) setReply("");
    setSending(false);
  };

  return (
    <li className="p-5 hover:bg-[#B026FF]/5 transition-colors" data-testid={`admin-ticket-${ticket.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex w-9 h-9 rounded-md bg-gradient-to-br from-[#FF1E56]/20 to-[#B026FF]/20 border border-[#B026FF]/40 items-center justify-center flex-shrink-0">
            <TicketIcon className="w-4 h-4 text-[#FF1E56]" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-white truncate">{ticket.subject}</p>
            <p className="text-xs text-[#A68CC2]">
              {ticket.user_name || ticket.user_email} · {ticket.user_email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${priority.cls}`}>
            {priority.label}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${
            isClosed ? "text-[#755D8D] border-[#755D8D]/40 bg-[#755D8D]/10" : "text-[#00FF7F] border-[#00FF7F]/40 bg-[#00FF7F]/10"
          }`}>
            {isClosed ? "Zamknięty" : "Otwarty"}
          </span>
          <span className="text-xs text-[#755D8D] whitespace-nowrap">
            {ticket.updated_at?.slice(0, 16).replace("T", " ")}
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="nx-btn-outline px-3 py-1 rounded-md text-xs"
            data-testid={`admin-ticket-toggle-${ticket.id}`}
          >
            {open ? "Zwiń" : "Otwórz"}
          </button>
        </div>
      </div>

      {open && (
        <div className="ml-12 mt-3 space-y-3">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-md ${
                m.author_role === "admin"
                  ? "bg-[#FF1E56]/10 border border-[#FF1E56]/30"
                  : "bg-[#150029]/60 border border-[#B026FF]/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                <span className={`text-xs font-bold ${m.author_role === "admin" ? "text-[#FF1E56]" : "text-[#B026FF]"}`}>
                  {m.author_role === "admin" ? "Admin" : "Klient"} · {m.author_name}
                </span>
                <span className="text-[10px] text-[#755D8D]">
                  {m.created_at?.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <p className="text-sm text-[#C9B9DD] whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          ))}

          {!isClosed && (
            <div className="pt-2 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Odpowiedz klientowi..."
                className="bg-[#0A0014] border-[#B026FF]/30 text-white min-h-[90px]"
                data-testid={`admin-ticket-reply-input-${ticket.id}`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={send}
                  disabled={sending || !reply.trim()}
                  className="nx-btn-primary px-4 py-2 rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  data-testid={`admin-ticket-reply-submit-${ticket.id}`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                  Wyślij odpowiedź
                </button>
                <button
                  onClick={() => onToggleStatus(ticket)}
                  className="nx-btn-outline px-4 py-2 rounded-md text-sm inline-flex items-center gap-2"
                  data-testid={`admin-ticket-close-${ticket.id}`}
                >
                  <Lock className="w-4 h-4" />
                  Zamknij ticket
                </button>
              </div>
            </div>
          )}
          {isClosed && (
            <button
              onClick={() => onToggleStatus(ticket)}
              className="nx-btn-outline px-4 py-2 rounded-md text-sm inline-flex items-center gap-2"
              data-testid={`admin-ticket-reopen-${ticket.id}`}
            >
              <Unlock className="w-4 h-4" />
              Otwórz ponownie
            </button>
          )}
        </div>
      )}
    </li>
  );
}
