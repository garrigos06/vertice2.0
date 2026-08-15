import { useEffect, useState } from "react";
import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";

const WHEN = [
  { k: "yesterday", l: "Ontem" },
  { k: "today", l: "Hoje" },
  { k: "tomorrow", l: "Amanhã" },
];

export default function Calendario() {
  const [when, setWhen] = useState("today");
  const [state, setState] = useState({ configured: true, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/matches", { params: { when } })
      .then((r) => setState(r.data))
      .catch(() => setState({ configured: true, items: [] }))
      .finally(() => setLoading(false));
  }, [when]);

  const grouped = (state.items || []).reduce((acc, m) => {
    const k = m.competition || "—";
    acc[k] = acc[k] || [];
    acc[k].push(m);
    return acc;
  }, {});

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
            Agenda esportiva
          </div>
          <h1 className="font-display text-4xl md:text-5xl">Calendário</h1>
        </div>
        <div className="flex gap-2 mb-6">
          {WHEN.map((w) => (
            <button
              key={w.k}
              onClick={() => setWhen(w.k)}
              data-testid={`cal-${w.k}`}
              className={`px-4 py-2 rounded-full text-sm border ${
                when === w.k
                  ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                  : "border-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              {w.l}
            </button>
          ))}
        </div>
        {!state.configured ? (
          <div className="vs-card p-8 text-center text-white/60" data-testid="cal-not-configured">
            Fonte esportiva não configurada.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="vs-skeleton h-14" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="vs-card p-10 text-center text-white/50" data-testid="cal-empty">
            Nenhuma partida encontrada para este dia.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([comp, arr]) => (
              <div key={comp}>
                <h3 className="font-display text-lg text-white/80 mb-3">{comp}</h3>
                <ul className="space-y-2">
                  {arr.map((m) => (
                    <li key={m.id} className="vs-card px-4 py-3 flex items-center gap-4">
                      <div className="font-mono-data text-xs text-[#CCFF00] w-14">
                        {m.kickoff ? new Date(m.kickoff).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </div>
                      <div className="flex-1 text-sm">
                        <span className="truncate">{m.home}</span>
                        <span className="text-white/40 mx-2">vs</span>
                        <span className="truncate">{m.away}</span>
                      </div>
                      <div className="text-xs text-white/40 hidden md:block">{m.country}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
