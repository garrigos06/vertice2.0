import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import {
  Users,
  Ticket,
  TrendingUp,
  XCircle,
  Percent,
  BadgeCheck,
  Plus,
  ArrowRight,
} from "lucide-react";

const Kpi = ({ label, value, icon: Icon, hl, testid }) => (
  <div className="vs-card p-4 sm:p-5" data-testid={testid}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <Icon size={14} className={hl ? "text-[#CCFF00]" : "text-white/40"} />
    </div>
    <div className={`font-display text-2xl sm:text-3xl mt-2 ${hl ? "text-[#CCFF00]" : ""}`}>
      {value ?? "—"}
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, description, onClick, testid, primary }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testid}
    className={`vs-card w-full text-left p-4 sm:p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5 ${
      primary ? "border-[#CCFF00]/30 vs-glow" : ""
    }`}
  >
    <div
      className={`h-11 w-11 shrink-0 rounded-lg grid place-items-center ${
        primary ? "bg-[#CCFF00] text-black" : "bg-white/5 text-[#CCFF00]"
      }`}
    >
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-white/50 truncate">{description}</div>
    </div>
    <ArrowRight size={16} className="text-white/40 shrink-0" />
  </button>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
          Visão geral
        </div>
        <h1 className="font-display text-3xl sm:text-4xl">Dashboard</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="vs-skeleton h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Kpi label="Usuários" value={stats?.users_total} icon={Users} testid="kpi-users-total" />
            <Kpi label="Grátis" value={stats?.users_free} icon={Users} testid="kpi-users-free" />
            <Kpi label="Pro" value={stats?.users_pro} icon={BadgeCheck} testid="kpi-users-pro" />
            <Kpi label="Full" value={stats?.users_full} icon={BadgeCheck} hl testid="kpi-users-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <Kpi label="Assinaturas ativas" value={stats?.subs_active} icon={BadgeCheck} testid="kpi-subs" />
            <Kpi label="Bilhetes publicados" value={stats?.bets_published} icon={Ticket} testid="kpi-bets-pub" />
            <Kpi label="Greens" value={stats?.greens} icon={TrendingUp} hl testid="kpi-greens" />
            <Kpi label="Reds" value={stats?.reds} icon={XCircle} testid="kpi-reds" />
          </div>
          <div className="mt-3 sm:mt-4 grid md:grid-cols-2 gap-3 sm:gap-4">
            <Kpi
              label="Taxa de acerto"
              value={stats ? `${stats.hit_rate}%` : "—"}
              icon={Percent}
              hl
              testid="kpi-hitrate"
            />
            <div className="vs-card p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                Próximas ações
              </div>
              <p className="text-sm text-white/70">
                Configure as chaves de API-Football e Kiwify nos secrets do Worker para ativar
                catálogo esportivo e ativação automática de planos.
              </p>
            </div>
          </div>

          {/* Ações rápidas */}
          <section className="mt-8" data-testid="quick-actions-section">
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Ações rápidas
              </div>
              <h2 className="font-display text-xl sm:text-2xl">Atalhos administrativos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <QuickAction
                icon={Plus}
                label="Criar novo bilhete"
                description="Publique uma nova análise"
                onClick={() => navigate("/admin/bilhetes?new=1")}
                testid="qa-new-bet"
                primary
              />
              <QuickAction
                icon={Ticket}
                label="Gerenciar bilhetes"
                description="Editar, publicar, marcar green/red"
                onClick={() => navigate("/admin/bilhetes")}
                testid="qa-manage-bets"
              />
              <QuickAction
                icon={Users}
                label="Gerenciar usuários"
                description="Planos, roles e status"
                onClick={() => navigate("/admin/usuarios")}
                testid="qa-manage-users"
              />
            </div>
          </section>
        </>
      )}
    </AdminLayout>
  );
}
