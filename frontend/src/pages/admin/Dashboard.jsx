import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { Users, Ticket, TrendingUp, XCircle, Percent, BadgeCheck } from "lucide-react";

const Kpi = ({ label, value, icon: Icon, hl, testid }) => (
  <div className="vs-card p-5" data-testid={testid}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <Icon size={14} className={hl ? "text-[#CCFF00]" : "text-white/40"} />
    </div>
    <div className={`font-display text-3xl mt-2 ${hl ? "text-[#CCFF00]" : ""}`}>{value ?? "—"}</div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">Visão geral</div>
        <h1 className="font-display text-4xl">Dashboard</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="vs-skeleton h-24" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Usuários" value={stats?.users_total} icon={Users} testid="kpi-users-total" />
            <Kpi label="Grátis" value={stats?.users_free} icon={Users} testid="kpi-users-free" />
            <Kpi label="Pro" value={stats?.users_pro} icon={BadgeCheck} testid="kpi-users-pro" />
            <Kpi label="Full" value={stats?.users_full} icon={BadgeCheck} hl testid="kpi-users-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Kpi label="Assinaturas ativas" value={stats?.subs_active} icon={BadgeCheck} testid="kpi-subs" />
            <Kpi label="Bilhetes publicados" value={stats?.bets_published} icon={Ticket} testid="kpi-bets-pub" />
            <Kpi label="Greens" value={stats?.greens} icon={TrendingUp} hl testid="kpi-greens" />
            <Kpi label="Reds" value={stats?.reds} icon={XCircle} testid="kpi-reds" />
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <Kpi label="Taxa de acerto" value={stats ? `${stats.hit_rate}%` : "—"} icon={Percent} hl testid="kpi-hitrate" />
            <div className="vs-card p-5">
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Próximas ações</div>
              <p className="text-sm text-white/70">
                Configure as chaves de API-Football e Kiwify no <code className="text-[#CCFF00]">.env</code> para
                ativar catálogo esportivo e ativação automática de planos.
              </p>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
