import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Hexagon, Loader2, LogIn, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/admin/login", form);
      localStorage.setItem("nx_admin_token", res.data.token);
      localStorage.setItem("nx_admin_email", res.data.email);
      toast.success("Zalogowano");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd logowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0A0014] flex items-center justify-center px-6 nx-hero-bg"
      data-testid="admin-login-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="nx-card rounded-2xl p-8 sm:p-10 max-w-md w-full"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-[#A68CC2] hover:text-white mb-6"
          data-testid="admin-login-back"
        >
          <ArrowLeft className="w-3 h-3" />
          Powrót do strony głównej
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <span className="relative inline-flex items-center justify-center w-9 h-9">
            <Hexagon className="w-9 h-9 text-[#B026FF]" strokeWidth={1.5} />
            <span className="absolute font-display font-black text-[#FF1E56] text-sm">N</span>
          </span>
          <span className="font-display font-black text-lg">
            Nexus<span className="nx-gradient-text">.Admin</span>
          </span>
        </div>

        <h1 className="font-display font-black text-3xl text-white mb-2">
          Panel administracyjny
        </h1>
        <p className="text-sm text-[#A68CC2] mb-8">
          Zaloguj się, aby zarządzać pakietami i transakcjami.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#C9B9DD]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-[#0A0014] border-[#B026FF]/30 text-white"
              placeholder="admin@nexusnetwork.pl"
              required
              data-testid="admin-login-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#C9B9DD]">
              Hasło
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-[#0A0014] border-[#B026FF]/30 text-white"
              placeholder="••••••••"
              required
              data-testid="admin-login-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="nx-btn-primary w-full py-3 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="admin-login-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Zaloguj się
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
