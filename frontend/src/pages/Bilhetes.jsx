import { useEffect, useState } from "react";
import PublicLayout from "../components/layout/PublicLayout";
import BetSlipCard from "../components/BetSlipCard";
import { api } from "../lib/api";

const CATEGORIES = [
  { k: null, label: "Todos" },
  { k: "SIMPLES", label: "Simples" },
  { k: "COMBINADO", label: "Combinado" },
  { k: "MULTIPLO", label: "Múltiplo" },
  { k: "SUPERODD", label: "Superodd" },
];

export default function Bilhetes() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get("/bets", { params: { limit: 100 } })
      .then((r) => setBets(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = category ? bets.filter((b) => b.category === category) : bets;

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
            Análises publicadas
          </div>
          <h1 className="font-display text-4xl md:text-5xl">Bilhetes</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Simples, combinados, múltiplos e superodds — todos com histórico transparente.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-1 px-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.k || "all"}
              onClick={() => setCategory(c.k)}
              data-testid={`filter-cat-${c.k || "all"}`}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
                category === c.k
                  ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                  : "border-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="bilhetes-loading">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="vs-skeleton h-60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="vs-card p-10 text-center text-white/50" data-testid="bilhetes-empty">
            Nenhum bilhete disponível nesta categoria.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((b) => (
              <BetSlipCard key={b.id} bet={b} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
