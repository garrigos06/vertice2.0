import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success(data.message);
      setSent(true);
    } catch (err) {
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-4xl mb-2">Esqueci minha senha</h1>
        <p className="text-white/60 mb-8">Informe seu e-mail e enviaremos as instruções.</p>
        {sent ? (
          <div className="vs-card p-6 text-white/80" data-testid="forgot-sent">
            Se existir uma conta com este e-mail, você receberá em instantes um link para
            redefinir sua senha. O link expira em 30 minutos.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/50">E-mail</label>
              <input
                type="email" required
                data-testid="forgot-email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
              />
            </div>
            <button
              type="submit" disabled={loading}
              data-testid="forgot-submit"
              className="w-full bg-[#CCFF00] text-black font-semibold py-3 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar instruções"}
            </button>
          </form>
        )}
        <div className="mt-6 text-sm">
          <Link to="/login" className="text-white/60 hover:text-white">← Voltar para o login</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
