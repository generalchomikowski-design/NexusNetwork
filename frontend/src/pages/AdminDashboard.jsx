import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, LogOut, Plus, Edit, Trash2, Loader2, Save, X, RefreshCcw } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // package or null
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nx_admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    api
      .get("/admin/me")
      .then(loadAll)
      .catch(() => {
        localStorage.removeItem("nx_admin_token");
        navigate("/admin/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pkgs, txns] = await Promise.all([
        api.get("/packages?active_only=false"),
        api.get("/admin/transactions"),
      ]);
      setPackages(pkgs.data || []);
      setTransactions(txns.data || []);
    } catch (e) {
      toast.error("Błąd ładowania danych");
    } finally {
      setLoading(false);
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
      loadAll();
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
      loadAll();
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
              onClick={loadAll}
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display font-black text-3xl">Panel zarządzania</h1>
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
                      <TableHead className="text-[#A68CC2]">Kwota</TableHead>
                      <TableHead className="text-[#A68CC2]">Status</TableHead>
                      <TableHead className="text-[#A68CC2]">Płatność</TableHead>
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
                        <TableCell className="text-white font-semibold">
                          {formatPLN(t.amount)}
                        </TableCell>
                        <TableCell className="text-[#A68CC2] text-sm">{t.status}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-bold ${
                              t.payment_status === "paid"
                                ? "text-[#00FF7F]"
                                : "text-[#A68CC2]"
                            }`}
                          >
                            {t.payment_status}
                          </span>
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
