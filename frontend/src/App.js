import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import Landing from "@/pages/Landing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0A0014] text-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#FF1E56] animate-spin" />
    </div>
  );
}

function GatedLanding() {
  const { user, loading } = useAuth();
  if (loading || user === null) return <LoadingScreen />;
  if (!user) return <AuthPage />;
  return <Landing />;
}

function AppRoutes() {
  const location = useLocation();
  // Detect Google OAuth fragment SYNCHRONOUSLY (before normal route render)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<GatedLanding />} />
      <Route path="/platnosc/sukces" element={<PaymentSuccess />} />
      <Route path="/platnosc/anulowane" element={<PaymentCancel />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App font-body">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1F003D",
            color: "#fff",
            border: "1px solid rgba(176, 38, 255, 0.35)",
          },
        }}
      />
    </div>
  );
}

export default App;
