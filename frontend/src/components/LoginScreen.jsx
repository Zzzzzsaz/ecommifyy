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
    if (newPin.length === 4) doLogin(newPin);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" data-testid="login-screen">
      <div className="w-full max-w-[280px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Ecommify</h1>
        </div>

        {/* PIN Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-center text-sm text-slate-500 mb-5">Wprowadź PIN</p>

          {/* PIN Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < pin.length ? "bg-slate-900" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* PIN Pad - 3x4 grid */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(String(d))}
                disabled={loading}
                className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-lg font-semibold text-slate-900 transition-colors disabled:opacity-50"
              >
                {d}
              </button>
            ))}
            <div /> {/* Empty space */}
            <button
              onClick={() => handleDigit("0")}
              disabled={loading}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-lg font-semibold text-slate-900 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "0"}
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-400"
            >
              <Delete size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
