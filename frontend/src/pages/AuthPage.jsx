import React, { useState } from "react";
import { motion } from "framer-motion";
import { Hexagon, Loader2, LogIn, UserPlus, Mail, Lock, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth, formatApiError } from "@/contexts/AuthContext";

const HERO_BG =
  "https://static.prod-images.emergentagent.com/jobs/a6c22810-5978-4df2-9cc1-acf3c498eedb/images/ccf0ae16f5637d91c49c8ca6def08e103199894b1e725c0d74137e9d06ab308c.png";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ email: "", password: "", name: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error("Uzupełnij email i hasło");
      return;
    }
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success("Zalogowano");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Błąd logowania");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.email || !regForm.password) {
      toast.error("Uzupełnij email i hasło");
      return;
    }
    if (regForm.password.length < 6) {
      toast.error("Hasło musi mieć co najmniej 6 znaków");
      return;
    }
    setLoading(true);
    try {
      await register(regForm.email, regForm.password, regForm.name || null);
      toast.success("Konto utworzone");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Błąd rejestracji");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="min-h-screen bg-[#0A0014] text-white nx-hero-bg flex items-center justify-center px-4 py-12"
      data-testid="auth-page"
    >
      <div
        className="absolute inset-0 opacity-25 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 nx-grid-bg opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="relative inline-flex items-center justify-center w-11 h-11">
              <Hexagon className="w-11 h-11 text-[#B026FF]" strokeWidth={1.5} />
              <span className="absolute font-display font-black text-[#FF1E56] text-base">N</span>
            </span>
            <span className="font-display font-black text-2xl">
              Nexus<span className="nx-gradient-text">.Network</span>
            </span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tighter">
            Wejdź do <span className="nx-gradient-text">społeczności</span>
          </h1>
          <p className="text-sm text-[#A68CC2] mt-2">
            Zaloguj się lub załóż konto, aby zobaczyć ofertę i zamówić serwer.
          </p>
        </div>

        <div className="nx-card rounded-2xl p-6 sm:p-8">
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList
              data-testid="auth-tabs"
              className="bg-[#150029]/60 border border-[#B026FF]/20 grid grid-cols-2 mb-6 h-auto p-1.5 w-full rounded-md"
            >
              <TabsTrigger
                value="login"
                data-testid="auth-tab-login"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF] data-[state=active]:text-white text-[#A68CC2] py-2"
              >
                Logowanie
              </TabsTrigger>
              <TabsTrigger
                value="register"
                data-testid="auth-tab-register"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF1E56] data-[state=active]:to-[#B026FF] data-[state=active]:text-white text-[#A68CC2] py-2"
              >
                Rejestracja
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <Field
                  id="login-email"
                  label="Email"
                  icon={Mail}
                  type="email"
                  placeholder="ty@example.com"
                  value={loginForm.email}
                  onChange={(v) => setLoginForm({ ...loginForm, email: v })}
                  testid="login-email"
                />
                <Field
                  id="login-password"
                  label="Hasło"
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(v) => setLoginForm({ ...loginForm, password: v })}
                  testid="login-password"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="nx-btn-primary w-full px-5 py-3 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="login-submit"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  Zaloguj się
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                <Field
                  id="reg-name"
                  label="Imię (opcjonalne)"
                  icon={UserIcon}
                  type="text"
                  placeholder="np. Player"
                  value={regForm.name}
                  onChange={(v) => setRegForm({ ...regForm, name: v })}
                  testid="register-name"
                />
                <Field
                  id="reg-email"
                  label="Email"
                  icon={Mail}
                  type="email"
                  placeholder="ty@example.com"
                  value={regForm.email}
                  onChange={(v) => setRegForm({ ...regForm, email: v })}
                  testid="register-email"
                />
                <Field
                  id="reg-password"
                  label="Hasło (min. 6 znaków)"
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={regForm.password}
                  onChange={(v) => setRegForm({ ...regForm, password: v })}
                  testid="register-password"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="nx-btn-primary w-full px-5 py-3 rounded-md text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="register-submit"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Utwórz konto
                </button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-[#755D8D] uppercase tracking-widest">
            <span className="flex-1 h-px bg-[#B026FF]/20" />
            albo
            <span className="flex-1 h-px bg-[#B026FF]/20" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full bg-white text-[#1F1F1F] hover:bg-[#F0F0F0] font-semibold py-3 rounded-md text-sm inline-flex items-center justify-center gap-3 transition-colors"
            data-testid="google-signin-button"
          >
            <GoogleIcon />
            Zaloguj przez Google
          </button>
        </div>

        <p className="text-center text-xs text-[#755D8D] mt-6">
          Logując się akceptujesz regulamin i politykę prywatności.
        </p>
      </motion.div>
    </div>
  );
}

function Field({ id, label, icon: Icon, type, value, onChange, placeholder, testid }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[#C9B9DD] text-sm">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#755D8D]" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-[#0A0014] border-[#B026FF]/30 text-white pl-10"
          data-testid={testid}
        />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
