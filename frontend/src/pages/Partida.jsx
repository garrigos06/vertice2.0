import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  BarChart3,
  Clock3,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";

const STATUS_LABELS = {
  TBD: "A definir",
  NS: "Não iniciado",
  "1H": "1º tempo",
  HT: "Intervalo",
  "2H": "2º tempo",
  ET: "Prorrogação",
  BT: "Intervalo da prorrogação",
  P: "Pênaltis",
  SUSP: "Suspenso",
  INT: "Interrompido",
  FT: "Encerrado",
  AET: "Encerrado após prorrogação",
  PEN: "Encerrado nos pênaltis",
  PST: "Adiado",
  CANC: "Cancelado",
  ABD: "Abandonado",
  AWD: "Resultado administrativo",
  WO: "W.O.",
};

function valueNumber(value) {
  if (value == null) {
    return 0;
  }

  const number = Number(
    String(value)
      .replace("%", "")
      .replace(",", ".")
  );

  return Number.isFinite(number)
    ? number
    : 0;
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return value;
}

function TeamLogo({
  src,
  name,
  size = "large",
}) {
  const classes =
    size === "large"
      ? "w-16 h-16 md:w-20 md:h-20"
      : "w-9 h-9";

  if (!src) {
    return (
      <div
        className={`${classes} rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center`}
      >
        <Shield
          className="text-white/30"
          size={size === "large" ? 28 : 16}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || ""}
      className={`${classes} object-contain`}
    />
  );
}

function PercentageCard({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        highlight
          ? "border-[#CCFF00]/30 bg-[#CCFF00]/[0.05]"
          : "border-white/[0.07] bg-white/[0.025]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>

      <div
        className={`mt-2 font-display text-3xl ${
          highlight
            ? "text-[#CCFF00]"
            : "text-white"
        }`}
      >
        {value != null
          ? `${value}%`
          : "—"}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  home,
  away,
}) {
  const homeNumber =
    valueNumber(home);

  const awayNumber =
    valueNumber(away);

  const total =
    homeNumber + awayNumber;

  const homeWidth =
    total > 0
      ? (homeNumber / total) * 100
      : 50;

  const awayWidth =
    total > 0
      ? (awayNumber / total) * 100
      : 50;

  return (
    <div className="py-4 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono-data text-sm font-semibold text-white">
          {displayValue(home)}
          {typeof home === "number"
            ? "%"
            : ""}
        </div>

        <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 text-center">
          {label}
        </div>

        <div className="font-mono-data text-sm font-semibold text-white">
          {displayValue(away)}
          {typeof away === "number"
            ? "%"
            : ""}
        </div>
      </div>

      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="bg-[#CCFF00]"
          style={{
            width: `${homeWidth}%`,
          }}
        />

        <div
          className="bg-white/25"
          style={{
            width: `${awayWidth}%`,
          }}
        />
      </div>
    </div>
  );
}

function MatchStatistic({
  row,
}) {
  const home =
    valueNumber(row.home);

  const away =
    valueNumber(row.away);

  const total =
    home + away;

  const homeWidth =
    total > 0
      ? (home / total) * 100
      : 50;

  const awayWidth =
    total > 0
      ? (away / total) * 100
      : 50;

  return (
    <div className="py-4 border-b border-white/[0.05] last:border-0">
      <div className="grid grid-cols-[65px_1fr_65px] items-center gap-3">
        <div className="font-mono-data text-sm font-semibold text-white">
          {displayValue(row.home)}
        </div>

        <div className="text-center text-xs text-white/50">
          {row.label}
        </div>

        <div className="font-mono-data text-sm font-semibold text-white text-right">
          {displayValue(row.away)}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full bg-[#CCFF00] rounded-full"
            style={{
              width: `${homeWidth}%`,
            }}
          />
        </div>

        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full bg-white/30 rounded-full"
            style={{
              width: `${awayWidth}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LastFiveTeam({
  team,
}) {
  if (!team) {
    return null;
  }

  const last =
    team.last_5 || {};

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-3">
        <TeamLogo
          src={team.logo}
          name={team.name}
          size="small"
        />

        <div className="font-semibold">
          {team.name}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <div className="rounded-lg bg-black/25 border border-white/[0.05] p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Forma
          </div>

          <div className="font-mono-data text-[#CCFF00] mt-1">
            {last.form != null
              ? `${last.form}%`
              : "—"}
          </div>
        </div>

        <div className="rounded-lg bg-black/25 border border-white/[0.05] p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Ataque
          </div>

          <div className="font-mono-data text-white mt-1">
            {last.attack != null
              ? `${last.attack}%`
              : "—"}
          </div>
        </div>

        <div className="rounded-lg bg-black/25 border border-white/[0.05] p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Defesa
          </div>

          <div className="font-mono-data text-white mt-1">
            {last.defense != null
              ? `${last.defense}%`
              : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-lg border border-white/[0.05] p-3">
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Média de gols
          </div>

          <div className="font-mono-data text-lg mt-1">
            {displayValue(
              last.goals_for
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.05] p-3">
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Gols sofridos
          </div>

          <div className="font-mono-data text-lg mt-1">
            {displayValue(
              last.goals_against
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Partida() {
  const { matchId } =
    useParams();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const initialMatch =
    location.state?.match || null;

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get(
          `/match-stats/${matchId}`
        );

      setData(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Não foi possível carregar as estatísticas desta partida."
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const match =
    data?.match || null;

  const prediction =
    data?.prediction || null;

  const statistics =
    data?.statistics || null;

  const homeName =
    match?.home?.name ||
    initialMatch?.home ||
    "Mandante";

  const awayName =
    match?.away?.name ||
    initialMatch?.away ||
    "Visitante";

  const homeLogo =
    match?.home?.logo ||
    initialMatch?.home_logo;

  const awayLogo =
    match?.away?.logo ||
    initialMatch?.away_logo;

  const competition =
    match?.competition?.name ||
    initialMatch?.competition;

  const competitionLogo =
    match?.competition?.logo ||
    initialMatch?.competition_logo;

  const kickoff =
    match?.kickoff ||
    initialMatch?.kickoff;

  const kickoffFormatted =
    kickoff
      ? new Date(
          kickoff
        ).toLocaleString(
          "pt-BR",
          {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }
        )
      : null;

  const homeScore =
    match?.home?.score ??
    initialMatch?.score_home;

  const awayScore =
    match?.away?.score ??
    initialMatch?.score_away;

  const hasScore =
    homeScore != null ||
    awayScore != null;

  const status =
    match?.status;

  const statusLabel =
    STATUS_LABELS[status] ||
    match?.status_long ||
    initialMatch?.status;

  const predictionPercent =
    prediction?.percent || {};

  const percentages = [
    predictionPercent.home,
    predictionPercent.draw,
    predictionPercent.away,
  ];

  const highest =
    Math.max(
      ...percentages.map(
        (value) =>
          value == null
            ? -1
            : Number(value)
      )
    );

  const comparisons =
    prediction?.comparison
      ? Object.values(
          prediction.comparison
        )
      : [];

  if (
    !loading &&
    data &&
    data.available === false
  ) {
    return (
      <PublicLayout>
        <section className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="vs-card mt-6 p-8 md:p-10 text-center">
            <BarChart3
              size={34}
              className="text-[#CCFF00] mx-auto"
            />

            <h1 className="font-display text-3xl mt-5">
              Estatísticas indisponíveis
            </h1>

            <p className="text-white/50 mt-3 max-w-lg mx-auto">
              {data.message ||
                "Não existem estatísticas avançadas disponíveis para esta partida."}
            </p>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-[#CCFF00] disabled:opacity-40"
          >
            <RefreshCw
              size={14}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Atualizar
          </button>
        </div>

        {error && !data ? (
          <div className="vs-card p-8 text-center">
            <div className="text-red-400 font-medium">
              Não foi possível carregar
            </div>

            <p className="mt-2 text-sm text-white/45">
              {error}
            </p>

            <button
              onClick={load}
              className="mt-5 bg-[#CCFF00] text-black font-semibold rounded-md px-5 py-2.5"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {/* HEADER DA PARTIDA */}
            <div className="vs-card relative overflow-hidden p-5 md:p-8">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#CCFF00]/[0.05] to-transparent"
              />

              <div className="relative">
                <div className="flex flex-col items-center text-center mb-7">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {competitionLogo && (
                      <img
                        src={
                          competitionLogo
                        }
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                    )}

                    {competition ||
                      "Partida"}
                  </div>

                  {match?.competition?.round && (
                    <div className="mt-1 text-[10px] text-white/30">
                      {
                        match
                          .competition
                          .round
                      }
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-10">
                  <div className="flex flex-col items-center">
                    <TeamLogo
                      src={homeLogo}
                      name={homeName}
                    />

                    <div className="font-display text-base md:text-xl text-center mt-3">
                      {homeName}
                    </div>
                  </div>

                  <div className="text-center min-w-[75px]">
                    {hasScore ? (
                      <div className="font-display text-4xl md:text-5xl">
                        {homeScore ?? 0}
                        <span className="text-white/25 mx-2">
                          :
                        </span>
                        {awayScore ?? 0}
                      </div>
                    ) : (
                      <div className="font-display text-2xl text-white/25">
                        VS
                      </div>
                    )}

                    {statusLabel && (
                      <div
                        className={`mt-2 text-[10px] uppercase tracking-wider ${
                          status ===
                            "1H" ||
                          status ===
                            "2H" ||
                          status ===
                            "HT"
                            ? "text-red-400"
                            : "text-white/35"
                        }`}
                      >
                        {statusLabel}

                        {match?.elapsed !=
                          null &&
                          ` · ${match.elapsed}'`}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <TeamLogo
                      src={awayLogo}
                      name={awayName}
                    />

                    <div className="font-display text-base md:text-xl text-center mt-3">
                      {awayName}
                    </div>
                  </div>
                </div>

                <div className="mt-7 pt-5 border-t border-white/[0.06] flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/40">
                  {kickoffFormatted && (
                    <div className="flex items-center gap-1.5">
                      <Clock3
                        size={13}
                      />

                      {kickoffFormatted}
                    </div>
                  )}

                  {match?.venue?.name && (
                    <div>
                      {
                        match.venue
                          .name
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading && !data && (
              <div className="mt-5 space-y-4">
                <div className="vs-skeleton h-48" />
                <div className="vs-skeleton h-72" />
              </div>
            )}

            {data && (
              <>
                {/* PROBABILIDADES */}
                {prediction && (
                  <section className="mt-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
                        <TrendingUp
                          size={13}
                        />
                        Pré-jogo
                      </div>

                      <h2 className="font-display text-2xl md:text-3xl mt-1">
                        Comparativo estatístico
                      </h2>
                    </div>

                    <div className="vs-card p-5 md:p-6">
                      <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <PercentageCard
                          label={homeName}
                          value={
                            predictionPercent.home
                          }
                          highlight={
                            Number(
                              predictionPercent.home
                            ) ===
                            highest
                          }
                        />

                        <PercentageCard
                          label="Empate"
                          value={
                            predictionPercent.draw
                          }
                          highlight={
                            Number(
                              predictionPercent.draw
                            ) ===
                            highest
                          }
                        />

                        <PercentageCard
                          label={awayName}
                          value={
                            predictionPercent.away
                          }
                          highlight={
                            Number(
                              predictionPercent.away
                            ) ===
                            highest
                          }
                        />
                      </div>

                      {(prediction.advice ||
                        prediction.winner) && (
                        <div className="mt-5 rounded-xl border border-[#CCFF00]/15 bg-[#CCFF00]/[0.025] p-4">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#CCFF00]">
                            <Sparkles
                              size={12}
                            />
                            Tendência dos dados
                          </div>

                          {prediction.advice && (
                            <div className="text-sm text-white/75 mt-2">
                              {
                                prediction.advice
                              }
                            </div>
                          )}

                          {prediction.winner && (
                            <div className="text-xs text-white/40 mt-1">
                              Maior tendência:
                              {" "}
                              {
                                prediction.winner
                              }
                              {prediction.winner_comment
                                ? ` — ${prediction.winner_comment}`
                                : ""}
                            </div>
                          )}
                        </div>
                      )}

                      {comparisons.length >
                        0 && (
                        <div className="mt-5">
                          {comparisons.map(
                            (
                              item,
                              index
                            ) => (
                              <ComparisonRow
                                key={
                                  index
                                }
                                label={
                                  item.label
                                }
                                home={
                                  item.home
                                }
                                away={
                                  item.away
                                }
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* ÚLTIMOS 5 */}
                {prediction &&
                  (prediction.home ||
                    prediction.away) && (
                    <section className="mt-6">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
                        <Trophy
                          size={13}
                        />
                        Momento
                      </div>

                      <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
                        Últimos 5 jogos
                      </h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <LastFiveTeam
                          team={
                            prediction.home
                          }
                        />

                        <LastFiveTeam
                          team={
                            prediction.away
                          }
                        />
                      </div>
                    </section>
                  )}

                {/* STATS DO JOGO */}
                <section className="mt-6">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
                    <BarChart3
                      size={13}
                    />
                    Partida
                  </div>

                  <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
                    Estatísticas do jogo
                  </h2>

                  {statistics?.available ? (
                    <div className="vs-card p-5 md:p-6">
                      <div className="grid grid-cols-[65px_1fr_65px] items-center gap-3 pb-4 border-b border-white/[0.07]">
                        <div className="text-xs font-semibold truncate">
                          {homeName}
                        </div>

                        <div className="text-[9px] text-center uppercase tracking-[0.18em] text-white/30">
                          Estatística
                        </div>

                        <div className="text-xs font-semibold text-right truncate">
                          {awayName}
                        </div>
                      </div>

                      {statistics.rows.map(
                        (
                          row,
                          index
                        ) => (
                          <MatchStatistic
                            key={`${row.type}-${index}`}
                            row={row}
                          />
                        )
                      )}
                    </div>
                  ) : data.statistics_pending ? (
                    <div className="vs-card p-7 md:p-9 text-center">
                      <Clock3
                        size={28}
                        className="mx-auto text-[#CCFF00]"
                      />

                      <h3 className="font-display text-xl mt-4">
                        Estatísticas em breve
                      </h3>

                      <p className="mt-2 text-sm text-white/45 max-w-xl mx-auto">
                        As estatísticas da partida,
                        como posse de bola,
                        finalizações, escanteios e
                        cartões, passam a ser
                        disponibilizadas pela fonte
                        de dados quando o jogo
                        começa.
                      </p>
                    </div>
                  ) : (
                    <div className="vs-card p-7 text-center text-sm text-white/45">
                      A fonte de dados ainda não
                      disponibilizou estatísticas
                      para esta partida.
                    </div>
                  )}
                </section>

                {!prediction && (
                  <div className="mt-6 vs-card p-6 text-center">
                    <div className="text-sm text-white/55">
                      O provedor não disponibilizou
                      dados de pré-jogo para este
                      confronto.
                    </div>
                  </div>
                )}

                {(data.errors?.prediction ||
                  data.errors?.statistics) && (
                  <div className="mt-4 text-[10px] text-white/20 text-center">
                    Alguns conjuntos de dados podem
                    não estar disponíveis para
                    todas as competições.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </PublicLayout>
  );
}
