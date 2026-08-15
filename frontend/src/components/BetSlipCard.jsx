import { Lock, ExternalLink, TrendingUp } from "lucide-react";

const statusBadge = {
  PENDENTE: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  GREEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RED: "bg-red-500/10 text-red-400 border-red-500/30",
  VOID: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  CANCELADO: "bg-white/5 text-white/40 border-white/10",
};

const statusLabel = {
  PENDENTE: "Pendente",
  GREEN: "Green",
  RED: "Red",
  VOID: "Void",
  CANCELADO: "Cancelado",
};

const planLabel = { FREE: "Grátis", PRO: "Pro", FULL: "Full" };
const planColor = {
  FREE: "text-white/60 border-white/10",
  PRO: "text-[#CCFF00] border-[#CCFF00]/40",
  FULL: "text-[#CCFF00] border-[#CCFF00]/60 bg-[#CCFF00]/5",
};

export default function BetSlipCard({ bet }) {
  const kickoff = bet.scheduled_at
    ? new Date(bet.scheduled_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <article
      data-testid={`bet-card-${bet.id}`}
      className="vs-card p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform"
    >
      {bet.featured && (
        <div className="absolute -top-px right-4 px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-[#CCFF00] text-black rounded-b">
          Destaque
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {bet.category}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${planColor[bet.required_plan] || planColor.FREE}`}>
              {planLabel[bet.required_plan]}
            </span>
          </div>
          <h3 className="font-display text-lg truncate">{bet.title}</h3>
          {bet.competition && (
            <p className="text-xs text-white/50 mt-0.5">{bet.competition}</p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${statusBadge[bet.status] || statusBadge.PENDENTE}`}>
          {statusLabel[bet.status] || bet.status}
        </span>
      </div>

      {bet.locked ? (
        <div className="mt-4 p-4 rounded-lg border border-dashed border-[#CCFF00]/30 bg-[#CCFF00]/[0.03] text-sm text-white/60 flex items-center gap-3">
          <Lock size={18} className="text-[#CCFF00]" />
          <div>
            <div className="font-medium text-white">Conteúdo {planLabel[bet.required_plan]}</div>
            <div className="text-xs">Assine o plano para ver as seleções e a análise.</div>
          </div>
        </div>
      ) : (
        <>
          {bet.selections?.length > 0 && (
            <ul className="space-y-2 mt-3">
              {bet.selections.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/5"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{s.match}</div>
                    <div className="text-[11px] text-white/50">{s.market}</div>
                  </div>
                  <span className="font-mono-data text-[#CCFF00] font-semibold">
                    {s.odd?.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {bet.rationale && (
            <p className="text-sm text-white/60 mt-3 line-clamp-3">{bet.rationale}</p>
          )}
        </>
      )}

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase text-white/40">Odd total</div>
            <div className="font-mono-data text-lg text-[#CCFF00] font-semibold">
              {bet.total_odd?.toFixed(2)}
            </div>
          </div>
          {bet.probability != null && (
            <div>
              <div className="text-[10px] uppercase text-white/40 flex items-center gap-1">
                <TrendingUp size={10} /> Prob.
              </div>
              <div className="font-mono-data text-sm text-white">{bet.probability}%</div>
            </div>
          )}
          {kickoff && (
            <div>
              <div className="text-[10px] uppercase text-white/40">Horário</div>
              <div className="text-xs text-white/80">{kickoff}</div>
            </div>
          )}
        </div>
        {!bet.locked && bet.external_url && (
          <a
            href={bet.external_url}
            target="_blank"
            rel="noreferrer nofollow"
            data-testid={`bet-external-${bet.id}`}
            className="text-xs bg-[#CCFF00] text-black font-semibold px-3 py-2 rounded-md hover:bg-[#e6ff4d] transition-colors flex items-center gap-1"
          >
            Abrir <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
