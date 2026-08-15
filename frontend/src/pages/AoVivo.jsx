import { useEffect, useState } from "react";
import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";
import { Radio } from "lucide-react";

export default function AoVivo() {
  const [state, setState] = useState({ configured: true, items: [], errors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.get("/matches", { params: { when: "live" } })
      .then((r) => setState(r.data))
      .catch(() => setState({ configured: true, items: [], errors: ["Erro ao carregar."] }))
      .finally(() => setLoading(false));
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.3em] text-red-400">Ao vivo</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl">Central ao vivo</h1>
        <p className="text-white/60 mt-2 max-w-2xl">Placares, minuto e eventos em tempo real.</p>

        <div className="mt-8">
          {!state.configured ? (
            <div className="vs-card p-8 text-center" data-testid="live-not-configured">
              <Radio className="mx-auto text-[#CCFF00] mb-3" />
              <div className="font-display text-xl mb-1">Fonte esportiva não configurada</div>
              <div className="text-sm text-white/50 max-w-md mx-auto">
                Adicione uma chave <code className="text-[#CCFF00]">API_FOOTBALL_KEY</code> ao
                servidor para começar a exibir partidas ao vivo.
              </div>
            </div>
          ) : loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="vs-skeleton h-16" />)}
            </div>
          ) : state.items.length === 0 ? (
            <div className="vs-card p-10 text-center text-white/50" data-testid="live-empty">
              Nenhuma partida ao vivo no momento.
            </div>
          ) : (
            <ul className="space-y-3" data-testid="live-list">
              {state.items.map((m) => (
                <li key={m.id} className="vs-card p-4 flex items-center gap-4">
                  <div className="text-xs text-[#CCFF00] font-mono-data w-14">
                    {m.elapsed ? `${m.elapsed}'` : m.status}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/40">{m.competition}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate">{m.home}</span>
                      <span className="font-mono-data text-[#CCFF00]">
                        {m.score_home ?? "-"} : {m.score_away ?? "-"}
                      </span>
                      <span className="truncate">{m.away}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
