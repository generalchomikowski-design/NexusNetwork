import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, Home, RefreshCcw } from "lucide-react";

export default function PaymentCancel() {
  return (
    <div
      className="min-h-screen bg-[#0A0014] flex items-center justify-center px-6 nx-hero-bg"
      data-testid="payment-cancel-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="nx-card rounded-2xl p-10 sm:p-12 max-w-lg w-full text-center"
      >
        <XCircle className="w-14 h-14 text-[#FF1E56] mx-auto mb-6" />
        <h1 className="font-display font-black text-3xl text-white mb-3">
          Płatność anulowana
        </h1>
        <p className="text-[#A68CC2] mb-8">
          Nie martw się – nic nie zostało pobrane z Twojego konta.
          Możesz spróbować ponownie w dowolnej chwili.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/#pakiety"
            className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center justify-center gap-2"
            data-testid="payment-cancel-retry"
          >
            <RefreshCcw className="w-4 h-4" />
            Spróbuj ponownie
          </Link>
          <Link
            to="/"
            className="nx-btn-outline px-6 py-3 rounded-md text-sm inline-flex items-center justify-center gap-2"
            data-testid="payment-cancel-home"
          >
            <Home className="w-4 h-4" />
            Strona główna
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
