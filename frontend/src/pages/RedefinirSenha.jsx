import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";
import { toast } from "sonner";

const strength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("As senhas não coincidem.");
    if (pw.length < 8) return toast.error("Senha muito curta (mín. 8).");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success(data.message);
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao redefinir");
    } finally {
      setLoading(false);
    }
  };

  const st = strength(pw);
  const stLabel = ["Muito fraca", "Fraca", "Média", "Boa", "Excelente"][st];

  return (
    <PublicLayout>
      <section className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-4xl mb-2">Redefinir senha</h1>
        <p className="text-white/60 mb-8">Escolha uma nova senha segura para sua conta.</p>
        {!token ? (
          <div className="vs-card p-6 text-white/80" data-testid="reset-notoken">
            Link inválido. Solicite um novo em <Link to="/recuperar-senha" className="text-[#CCFF00]">recuperar senha</Link>.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/50">Nova senha</label>
              <input
                type="password" required minLength={8}
                data-testid="reset-password"
                value={pw} onChange={(e) => setPw(e.target.value)}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
              />
              {pw && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${st < 2 ? "bg-red-500" : st < 4 ? "bg-amber-400" : "bg-[#CCFF00]"}`}
                      style={{ width: `${(st / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50">{stLabel}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/50">Confirmar senha</label>
              <input
                type="password" required minLength={8}
                data-testid="reset-password-confirm"
                value={pw2} onChange={(e) => setPw2(e.target.value)}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
              />
            </div>
            <button
              type="submit" disabled={loading}
              data-testid="reset-submit"
              className="w-full bg-[#CCFF00] text-black font-semibold py-3 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50"
            >
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>
        )}
      </section>
    </PublicLayout>
  );
}
