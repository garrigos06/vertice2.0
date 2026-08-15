import { useEffect, useState } from "react";
import PublicLayout from "../components/layout/PublicLayout";
import BetSlipCard from "../components/BetSlipCard";
import { api } from "../lib/api";

export default function Historico() {
  const [data, setData] = useState({ items: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    api.get("/bets/history", { params: { limit: 200 } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const items = statusFilter ? data.items.filter((i) => i.status === statusFilter) : data.items;
  const s = data.stats;

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">Transparência</div>
          <h1 className="font-display text-4xl md:text-5xl">Histórico completo</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Publicamos todos os resultados — greens, reds e voids. Nada é apagado.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { l: "Total", v: s?.total ?? "—" },
            { l: "Greens", v: s?.green ?? "—", c: "text-emerald-400" },
            { l: "Reds", v: s?.red ?? "—", c: "text-red-400" },
            { l: "Taxa de acerto", v: s ? `${s.hit_rate}%` : "—", c: "text-[#CCFF00]" },
          ].map((k, i) => (
            <div key={i} className="vs-card p-5" data-testid={`hist-stat-${i}`}>
              <div className="text-xs uppercase tracking-widest text-white/40">{k.l}</div>
              <div className={`font-display text-3xl mt-2 ${k.c || ""}`}>{k.v}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { k: null, l: "Todos" },
            { k: "GREEN", l: "Green" },
            { k: "RED", l: "Red" },
            { k: "VOID", l: "Void" },
          ].map((f) => (
            <button
              key={f.k || "all"}
              onClick={() => setStatusFilter(f.k)}
              data-testid={`hist-filter-${f.k || "all"}`}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                statusFilter === f.k
                  ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                  : "border-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="vs-skeleton h-60" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="vs-card p-10 text-center text-white/50" data-testid="hist-empty">
            Nenhum bilhete liquidado ainda.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((b) => <BetSlipCard key={b.id} bet={b} />)}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
