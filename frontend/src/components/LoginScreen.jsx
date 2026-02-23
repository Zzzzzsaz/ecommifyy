import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Delete, Loader2 } from "lucide-react";

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
      toast.error("Nieprawidłowy PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50"
      data-testid="login-screen"
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ecommify</h1>
          <p className="text-slate-500 text-sm mt-1">Panel Ecommify</p>
        </div>

        {/* PIN Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-center text-sm text-slate-600 mb-6">Wprowadź PIN aby się zalogować</p>

          {/* PIN Dots */}
          <div className="flex justify-center gap-4 mb-8" data-testid="pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pin.length 
                    ? "bg-slate-900 scale-110" 
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-3" data-testid="pin-pad">
            {digits.map((d, idx) => {
              if (d === null) return <div key={idx} />;
              if (d === "del") {
                return (
                  <button
                    key={idx}
                    onClick={handleDelete}
                    className="pin-btn flex items-center justify-center text-slate-400 hover:text-slate-600"
                    data-testid="pin-delete-btn"
                  >
                    <Delete size={20} />
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleDigit(String(d))}
                  disabled={loading}
                  className="pin-btn disabled:opacity-50"
                  data-testid={`pin-digit-${d}`}
                >
                  {loading && pin.length === 4 ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    d
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400">
          Wersja 2.0 &bull; Panel Ecommify
        </p>
      </div>
    </div>
  );
}
