import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, Home, AlertCircle } from "lucide-react";
import { api, formatPLN } from "@/lib/api";

const POLL_MAX = 10;
const POLL_INTERVAL = 2000;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState("checking"); // checking | paid | expired | error
  const [data, setData] = useState(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const res = await api.get(`/checkout/status/${sessionId}`);
        setData(res.data);
        if (res.data.payment_status === "paid") {
          setState("paid");
          return;
        }
        if (res.data.status === "expired") {
          setState("expired");
          return;
        }
        if (attemptsRef.current >= POLL_MAX) {
          setState("error");
          return;
        }
        timerRef.current = setTimeout(poll, POLL_INTERVAL);
      } catch (e) {
        if (attemptsRef.current >= POLL_MAX) {
          setState("error");
        } else {
          timerRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };

    poll();
    return () => clearTimeout(timerRef.current);
  }, [sessionId]);

  return (
    <div
      className="min-h-screen bg-[#0A0014] flex items-center justify-center px-6 nx-hero-bg"
      data-testid="payment-success-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="nx-card rounded-2xl p-10 sm:p-12 max-w-lg w-full text-center"
      >
        {state === "checking" && (
          <div data-testid="payment-status-checking">
            <Loader2 className="w-14 h-14 text-[#FF1E56] animate-spin mx-auto mb-6" />
            <h1 className="font-display font-black text-2xl text-white mb-2">
              Sprawdzamy status płatności...
            </h1>
            <p className="text-[#A68CC2]">To zajmie tylko chwilę.</p>
          </div>
        )}

        {state === "paid" && (
          <div data-testid="payment-status-paid">
            <div className="inline-flex w-16 h-16 rounded-full bg-[#00FF7F]/15 border border-[#00FF7F]/40 items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#00FF7F]" />
            </div>
            <h1 className="font-display font-black text-3xl text-white mb-3">
              Płatność udana!
            </h1>
            <p className="text-[#A68CC2] mb-2">
              Dziękujemy za zakup pakietu{" "}
              <span className="text-white font-semibold">{data?.package_name}</span>.
            </p>
            <p className="text-[#A68CC2] mb-8">
              Kwota:{" "}
              <span className="text-white font-bold">
                {formatPLN(data?.amount_total || 0)}
              </span>
            </p>
            <p className="text-sm text-[#755D8D] mb-8">
              Dane dostępowe do serwera otrzymasz na email w ciągu 5 minut.
            </p>
            <Link
              to="/"
              className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2"
              data-testid="payment-success-home-button"
            >
              <Home className="w-4 h-4" />
              Powrót do strony głównej
            </Link>
          </div>
        )}

        {state === "expired" && (
          <div data-testid="payment-status-expired">
            <XCircle className="w-14 h-14 text-[#FF1E56] mx-auto mb-6" />
            <h1 className="font-display font-black text-2xl text-white mb-3">
              Sesja płatności wygasła
            </h1>
            <p className="text-[#A68CC2] mb-8">
              Spróbuj ponownie z poziomu strony głównej.
            </p>
            <Link
              to="/"
              className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Powrót
            </Link>
          </div>
        )}

        {state === "error" && (
          <div data-testid="payment-status-error">
            <AlertCircle className="w-14 h-14 text-[#FF1E56] mx-auto mb-6" />
            <h1 className="font-display font-black text-2xl text-white mb-3">
              Status płatności niedostępny
            </h1>
            <p className="text-[#A68CC2] mb-8">
              Spróbuj odświeżyć stronę lub sprawdź skrzynkę email po potwierdzenie.
            </p>
            <Link
              to="/"
              className="nx-btn-primary px-6 py-3 rounded-md text-sm inline-flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Powrót do strony głównej
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
