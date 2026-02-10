import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_d80f261d-499e-4117-b40a-11f7363e88f3/artifacts/gvqot30h_ecommify%20logo.png";

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length >= 4 || loading) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      doLogin(newPin);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin(pin.slice(0, -1));
  };

  const doLogin = async (code) => {
    setLoading(true);
    try {
      const resp = await api.login(code);
      toast.success(`Witaj, ${resp.data.user.name}!`);
      onLogin(resp.data);
    } catch {
      toast.error("Nieprawidlowy PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 60%)" }}
      data-testid="login-screen"
    >
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 w-full max-w-xs"
      >
        <img src={LOGO_URL} alt="Ecommify" className="h-14 object-contain" data-testid="login-logo" />
        <h1 className="font-heading text-3xl font-bold text-white tracking-wide">ECOMMIFY</h1>
        <p className="text-ecom-muted text-sm -mt-4">Wprowadz PIN</p>

        <div className="flex gap-4" data-testid="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: i < pin.length ? 1.2 : 1 }}
              className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
                i < pin.length ? "bg-ecom-primary border-ecom-primary" : "border-ecom-border"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full" data-testid="pin-pad">
          {digits.map((d, idx) => {
            if (d === null) return <div key={idx} />;
            if (d === "del") {
              return (
                <button
                  key={idx}
                  onClick={handleDelete}
                  className="pin-btn h-16 rounded-xl flex items-center justify-center text-ecom-muted hover:text-white"
                  data-testid="pin-delete-btn"
                >
                  <Delete size={22} />
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => handleDigit(String(d))}
                disabled={loading}
                className="pin-btn h-16 rounded-xl border border-ecom-border text-white text-xl font-medium flex items-center justify-center bg-transparent hover:border-ecom-primary/50"
                data-testid={`pin-digit-${d}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
