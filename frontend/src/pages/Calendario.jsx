import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";

const WHEN = [
  { k: "yesterday", l: "Ontem" },
  { k: "today", l: "Hoje" },
  { k: "tomorrow", l: "Amanhã" },
];

const STATUS_LABEL = {
  SCHEDULED: "Agendado",
  LIVE: "Ao vivo",
  HALFTIME: "Intervalo",
  FINISHED: "Encerrado",
  POSTPONED: "Adiado",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
};

export default function Calendario() {
  const [when, setWhen] = useState("today");

  const [state, setState] = useState({
    configured: true,
    items: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    api
      .get("/matches", {
        params: { when },
      })
      .then((response) => {
        setState(response.data);
      })
      .catch(() => {
        setState({
          configured: true,
          items: [],
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [when]);

  const grouped = (state.items || []).reduce(
    (acc, match) => {
      const competition =
        match.competition || "Outras competições";

      acc[competition] =
        acc[competition] || [];

      acc[competition].push(match);

      return acc;
    },
    {}
  );

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
            Agenda esportiva
          </div>

          <h1 className="font-display text-4xl md:text-5xl">
            Calendário
          </h1>

          <p className="mt-3 max-w-2xl text-sm md:text-base text-white/50">
            Consulte os confrontos e abra uma partida
            para visualizar dados, comparativos e
            estatísticas disponíveis.
          </p>
        </div>

        <div className="flex gap-2 mb-7 overflow-x-auto no-scrollbar">
          {WHEN.map((item) => (
            <button
              key={item.k}
              onClick={() => setWhen(item.k)}
              data-testid={`cal-${item.k}`}
              className={`px-4 py-2 rounded-full text-sm border whitespace-nowrap transition-colors ${
                when === item.k
                  ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                  : "border-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              {item.l}
            </button>
          ))}
        </div>

        {!state.configured ? (
          <div
            className="vs-card p-8 text-center text-white/60"
            data-testid="cal-not-configured"
          >
            Fonte esportiva não configurada.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="vs-skeleton h-20"
              />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div
            className="vs-card p-10 text-center text-white/50"
            data-testid="cal-empty"
          >
            Nenhuma partida encontrada para este dia.
          </div>
        ) : (
          <div className="space-y-9">
            {Object.entries(grouped).map(
              ([competition, matches]) => (
                <div key={competition}>
                  <div className="flex items-center gap-3 mb-3">
                    {matches[0]?.competition_logo && (
                      <img
                        src={
                          matches[0].competition_logo
                        }
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                    )}

                    <div>
                      <h3 className="font-display text-lg text-white/90">
                        {competition}
                      </h3>

                      {matches[0]?.country && (
                        <div className="text-[10px] uppercase tracking-wider text-white/35">
                          {matches[0].country}
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {matches.map((match) => {
                      const kickoff =
                        match.kickoff
                          ? new Date(
                              match.kickoff
                            ).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "--:--";

                      const hasScore =
                        match.score_home != null ||
                        match.score_away != null;

                      const status =
                        STATUS_LABEL[
                          match.status
                        ] || match.status;

                      return (
                        <li key={match.id}>
                          <Link
                            to={`/partida/${match.id}?from=${when}`}
                            state={{ match }}
                            className="vs-card group flex items-center gap-3 md:gap-5 px-4 py-4 transition-all hover:border-[#CCFF00]/25 hover:-translate-y-px"
                          >
                            <div className="w-12 md:w-14 shrink-0">
                              <div className="font-mono-data text-xs text-[#CCFF00]">
                                {kickoff}
                              </div>

                              {status && (
                                <div
                                  className={`mt-1 text-[9px] uppercase tracking-wide ${
                                    match.status ===
                                      "LIVE" ||
                                    match.status ===
                                      "HALFTIME"
                                      ? "text-red-400"
                                      : "text-white/30"
                                  }`}
                                >
                                  {status}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {match.home_logo && (
                                  <img
                                    src={
                                      match.home_logo
                                    }
                                    alt=""
                                    className="w-5 h-5 object-contain shrink-0"
                                  />
                                )}

                                <span className="truncate text-sm text-white/90">
                                  {match.home}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                {match.away_logo && (
                                  <img
                                    src={
                                      match.away_logo
                                    }
                                    alt=""
                                    className="w-5 h-5 object-contain shrink-0"
                                  />
                                )}

                                <span className="truncate text-sm text-white/90">
                                  {match.away}
                                </span>
                              </div>
                            </div>

                            {hasScore && (
                              <div className="font-display text-xl text-white shrink-0">
                                <div>
                                  {match.score_home ??
                                    "-"}
                                </div>

                                <div className="mt-1">
                                  {match.score_away ??
                                    "-"}
                                </div>
                              </div>
                            )}

                            <div className="hidden sm:flex shrink-0 items-center gap-2 text-xs font-medium text-white/45 group-hover:text-[#CCFF00] transition-colors">
                              <BarChart3
                                size={15}
                              />

                              Estatísticas

                              <ArrowRight
                                size={14}
                                className="transition-transform group-hover:translate-x-1"
                              />
                            </div>

                            <ArrowRight
                              size={17}
                              className="sm:hidden shrink-0 text-white/30 group-hover:text-[#CCFF00]"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
