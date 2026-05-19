import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUserFromCallback } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/");
      return;
    }
    const sessionId = decodeURIComponent(m[1]);

    (async () => {
      try {
        const res = await api.post("/auth/google/session", { session_id: sessionId });
        setUserFromCallback(res.data);
        toast.success("Zalogowano przez Google");
      } catch (err) {
        toast.error("Nie udało się zalogować przez Google");
      } finally {
        // Strip hash and go to home
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0014] flex items-center justify-center text-white nx-hero-bg">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#FF1E56] animate-spin mx-auto mb-4" />
        <p className="text-[#A68CC2]">Finalizowanie logowania...</p>
      </div>
    </div>
  );
}
