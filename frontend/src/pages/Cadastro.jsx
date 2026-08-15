import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Cadastro() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Senha deve ter ao menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Conta criada com sucesso!");
      navigate("/conta");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-4xl mb-2">Criar conta</h1>
        <p className="text-white/60 mb-8">Comece grátis e evolua quando quiser.</p>
        <form onSubmit={submit} className="space-y-4" data-testid="register-form">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Nome</label>
            <input
              type="text" required minLength={2}
              data-testid="register-name"
              value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">E-mail</label>
            <input
              type="email" required
              data-testid="register-email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">Senha (mín. 8)</label>
            <input
              type="password" required minLength={8}
              data-testid="register-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
            />
          </div>
          <button
            type="submit" disabled={loading}
            data-testid="register-submit"
            className="w-full bg-[#CCFF00] text-black font-semibold py-3 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>
        <div className="mt-6 text-sm text-white/60">
          Já tem conta? <Link to="/login" data-testid="register-login-link" className="text-[#CCFF00]">Entrar</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
