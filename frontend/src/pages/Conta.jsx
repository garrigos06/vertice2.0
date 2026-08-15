import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const planLabel = { FREE: "Grátis", PRO: "Pro", FULL: "Full" };

export default function Conta() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (!user) return null;

  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-14">
        <h1 className="font-display text-4xl md:text-5xl mb-2">Minha conta</h1>
        <p className="text-white/60 mb-10">Gerencie seu perfil e assinatura.</p>

        <div className="vs-card p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#CCFF00] text-black grid place-items-center font-bold text-xl">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="font-display text-2xl">{user.name}</div>
              <div className="text-sm text-white/60">{user.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Plano</div>
              <div className="font-display text-xl text-[#CCFF00]">{planLabel[user.plan]}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Assinatura</div>
              <div className="font-display text-xl">{user.subscription_status}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <button
              onClick={() => navigate("/admin")}
              data-testid="conta-goto-admin"
              className="bg-[#CCFF00] text-black font-semibold px-6 py-3 rounded-md hover:bg-[#e6ff4d]"
            >
              Acessar painel admin
            </button>
          )}
          <button
            data-testid="conta-logout"
            onClick={async () => { await logout(); toast.success("Você saiu."); navigate("/"); }}
            className="border border-white/15 px-6 py-3 rounded-md hover:bg-white/5"
          >
            Sair
          </button>
        </div>
      </section>
    </PublicLayout>
  );
}
