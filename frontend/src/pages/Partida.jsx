import {
  useCallback,
  useEffect,
  useMemo,
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
  Target,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";


const FORM_SAMPLES = [5, 10, 15];


const STATUS_LABELS = {
  TBD: "A definir",
  NS: "Não iniciado",
  SCHEDULED: "Agendado",

  "1H": "1º tempo",
  HT: "Intervalo",
  "2H": "2º tempo",
  LIVE: "Ao vivo",
  HALFTIME: "Intervalo",

  ET: "Prorrogação",
  BT: "Intervalo da prorrogação",
  P: "Pênaltis",

  SUSP: "Suspenso",
  SUSPENDED: "Suspenso",

  INT: "Interrompido",
  INTERRUPTED: "Interrompido",

  FT: "Encerrado",
  FINISHED: "Encerrado",

  AET: "Encerrado após prorrogação",
  PEN: "Encerrado nos pênaltis",

  PST: "Adiado",
  POSTPONED: "Adiado",

  CANC: "Cancelado",
  CANCELED: "Cancelado",

  ABD: "Abandonado",
  ABANDONED: "Abandonado",

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


function decimal(
  value,
  digits = 2
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits:
        digits,
      maximumFractionDigits:
        digits,
    }
  );
}


function percent(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${decimal(value, 0)}%`;
}


function shortDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Date(
      value
    ).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
      }
    );
  } catch {
    return "";
  }
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
        className={`
          ${classes}
          rounded-full
          border border-white/10
          bg-white/[0.03]
          flex items-center
          justify-center
        `}
      >
        <Shield
          className="text-white/30"
          size={
            size === "large"
              ? 28
              : 16
          }
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
      className={`
        rounded-xl border p-4 text-center
        ${
          highlight
            ? "border-[#CCFF00]/30 bg-[#CCFF00]/[0.05]"
            : "border-white/[0.07] bg-white/[0.025]"
        }
      `}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 truncate">
        {label}
      </div>

      <div
        className={`
          mt-2 font-display text-3xl
          ${
            highlight
              ? "text-[#CCFF00]"
              : "text-white"
          }
        `}
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
      ? (homeNumber / total) *
        100
      : 50;

  const awayWidth =
    total > 0
      ? (awayNumber / total) *
        100
      : 50;

  return (
    <div className="py-4 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono-data text-sm font-semibold text-white">
          {displayValue(home)}
          {typeof home ===
          "number"
            ? "%"
            : ""}
        </div>

        <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 text-center">
          {label}
        </div>

        <div className="font-mono-data text-sm font-semibold text-white">
          {displayValue(away)}
          {typeof away ===
          "number"
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
          {displayValue(
            row.home
          )}
        </div>

        <div className="text-center text-xs text-white/50">
          {row.label}
        </div>

        <div className="font-mono-data text-sm font-semibold text-white text-right">
          {displayValue(
            row.away
          )}
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


function FormResult({
  result,
}) {
  const styles = {
    W: {
      label: "V",
      className:
        "border-[#CCFF00]/35 bg-[#CCFF00]/10 text-[#CCFF00]",
      title: "Vitória",
    },

    D: {
      label: "E",
      className:
        "border-white/15 bg-white/[0.05] text-white/70",
      title: "Empate",
    },

    L: {
      label: "D",
      className:
        "border-red-400/25 bg-red-400/[0.07] text-red-400",
      title: "Derrota",
    },
  };

  const item =
    styles[result] ||
    styles.D;

  return (
    <div
      title={item.title}
      className={`
        w-8 h-8
        rounded-lg
        border
        flex items-center
        justify-center
        text-[11px]
        font-bold
        ${item.className}
      `}
    >
      {item.label}
    </div>
  );
}


function FormStrip({
  form,
}) {
  const results =
    String(form || "")
      .split("")
      .filter(Boolean);

  if (!results.length) {
    return (
      <div className="text-xs text-white/30">
        Sem sequência disponível
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {results.map(
        (result, index) => (
          <FormResult
            key={`${result}-${index}`}
            result={result}
          />
        )
      )}
    </div>
  );
}


function TeamFormCard({
  team,
}) {
  if (!team) {
    return null;
  }

  const summary =
    team.summary || {};

  return (
    <div className="vs-card p-5 md:p-6 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#CCFF00]/[0.035] to-transparent pointer-events-none"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <TeamLogo
            src={team.logo}
            name={team.name}
            size="small"
          />

          <div className="min-w-0">
            <div className="font-display text-lg truncate">
              {team.short_name ||
                team.name}
            </div>

            <div className="text-[10px] uppercase tracking-[0.16em] text-white/30 mt-0.5">
              {
                team.sample_actual
              }{" "}
              jogos analisados
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/30 mb-2">
            Sequência recente
          </div>

          <FormStrip
            form={team.form}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">
              Pontos / jogo
            </div>

            <div className="font-display text-2xl text-[#CCFF00] mt-1">
              {decimal(
                summary.points_per_game,
                2
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">
              Vitórias
            </div>

            <div className="font-display text-2xl mt-1">
              {percent(
                summary.win_rate
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">
              Gols marcados
            </div>

            <div className="font-mono-data text-lg mt-1">
              {decimal(
                summary.avg_goals_for,
                2
              )}
              <span className="text-[10px] text-white/30 ml-1">
                / jogo
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">
              Gols sofridos
            </div>

            <div className="font-mono-data text-lg mt-1">
              {decimal(
                summary.avg_goals_against,
                2
              )}
              <span className="text-[10px] text-white/30 ml-1">
                / jogo
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-mono-data text-sm text-[#CCFF00]">
                {summary.wins ??
                  0}
              </div>

              <div className="text-[9px] uppercase tracking-wider text-white/25 mt-0.5">
                Vitórias
              </div>
            </div>

            <div>
              <div className="font-mono-data text-sm text-white/70">
                {summary.draws ??
                  0}
              </div>

              <div className="text-[9px] uppercase tracking-wider text-white/25 mt-0.5">
                Empates
              </div>
            </div>

            <div>
              <div className="font-mono-data text-sm text-red-400">
                {summary.losses ??
                  0}
              </div>

              <div className="text-[9px] uppercase tracking-wider text-white/25 mt-0.5">
                Derrotas
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function RecentMetricRow({
  label,
  home,
  away,
  format = "number",
}) {
  const homeNumber =
    valueNumber(home);

  const awayNumber =
    valueNumber(away);

  const maximum = Math.max(
    homeNumber,
    awayNumber,
    0.01
  );

  const homeWidth =
    (homeNumber / maximum) *
    100;

  const awayWidth =
    (awayNumber / maximum) *
    100;

  const formatter = (
    value
  ) => {
    if (format === "percent") {
      return percent(value);
    }

    if (format === "decimal") {
      return decimal(
        value,
        2
      );
    }

    return displayValue(
      value
    );
  };

  return (
    <div className="py-4 border-b border-white/[0.05] last:border-0">
      <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3">
        <div className="font-mono-data text-sm font-semibold text-white">
          {formatter(home)}
        </div>

        <div className="text-[10px] uppercase tracking-[0.12em] text-white/35 text-center">
          {label}
        </div>

        <div className="font-mono-data text-sm font-semibold text-white text-right">
          {formatter(away)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-2">
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


function RecentMatchCard({
  match,
}) {
  const resultMap = {
    W: {
      label: "V",
      style:
        "text-[#CCFF00] border-[#CCFF00]/25 bg-[#CCFF00]/[0.06]",
    },

    D: {
      label: "E",
      style:
        "text-white/60 border-white/10 bg-white/[0.03]",
    },

    L: {
      label: "D",
      style:
        "text-red-400 border-red-400/20 bg-red-400/[0.05]",
    },
  };

  const result =
    resultMap[match.result] ||
    resultMap.D;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3.5">
      <div className="flex items-center gap-3">
        <div
          className={`
            w-8 h-8
            rounded-lg
            border
            shrink-0
            flex items-center
            justify-center
            font-bold
            text-[11px]
            ${result.style}
          `}
        >
          {result.label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {match.home_logo && (
                  <img
                    src={
                      match.home_logo
                    }
                    alt=""
                    className="w-4 h-4 object-contain shrink-0"
                  />
                )}

                <span className="text-xs text-white/65 truncate">
                  {match.home}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                {match.away_logo && (
                  <img
                    src={
                      match.away_logo
                    }
                    alt=""
                    className="w-4 h-4 object-contain shrink-0"
                  />
                )}

                <span className="text-xs text-white/65 truncate">
                  {match.away}
                </span>
              </div>
            </div>

            <div className="font-display text-base text-right leading-6">
              <div>
                {match.score_home ??
                  "-"}
              </div>

              <div>
                {match.score_away ??
                  "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-white/20 shrink-0">
          {shortDate(
            match.kickoff
          )}
        </div>
      </div>
    </div>
  );
}


function TeamRecentMatches({
  team,
}) {
  if (
    !team ||
    !team.matches?.length
  ) {
    return null;
  }

  return (
    <div className="vs-card p-4 md:p-5">
      <div className="flex items-center gap-3 mb-4">
        <TeamLogo
          src={team.logo}
          name={team.name}
          size="small"
        />

        <div>
          <div className="font-display text-lg">
            {team.short_name ||
              team.name}
          </div>

          <div className="text-[9px] uppercase tracking-[0.15em] text-white/25">
            Partidas recentes
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {team.matches.map(
          (match) => (
            <RecentMatchCard
              key={match.id}
              match={match}
            />
          )
        )}
      </div>
    </div>
  );
}


function InsightCard({
  title,
  text,
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[#CCFF00]">
        {title}
      </div>

      <div className="text-sm leading-relaxed text-white/65 mt-2">
        {text}
      </div>
    </div>
  );
}


function buildInsights(
  formData
) {
  if (
    !formData?.available ||
    !formData.home ||
    !formData.away
  ) {
    return [];
  }

  const home =
    formData.home;

  const away =
    formData.away;

  const hs =
    home.summary || {};

  const as =
    away.summary || {};

  const insights = [];

  const homePPG =
    valueNumber(
      hs.points_per_game
    );

  const awayPPG =
    valueNumber(
      as.points_per_game
    );

  if (
    homePPG !==
    awayPPG
  ) {
    const stronger =
      homePPG >
      awayPPG
        ? home
        : away;

    const strongerSummary =
      homePPG >
      awayPPG
        ? hs
        : as;

    const weakerSummary =
      homePPG >
      awayPPG
        ? as
        : hs;

    insights.push({
      title:
        "Momento recente",

      text:
        `${
          stronger.short_name ||
          stronger.name
        } soma ${decimal(
          strongerSummary.points_per_game,
          2
        )} pontos por jogo no recorte, contra ${decimal(
          weakerSummary.points_per_game,
          2
        )} do adversário.`,
    });
  }

  insights.push({
    title:
      "Produção de gols",

    text:
      `${
        home.short_name ||
        home.name
      } apresenta ${decimal(
        hs.avg_goals_for,
        2
      )} gol por jogo, enquanto ${
        away.short_name ||
        away.name
      } registra ${decimal(
        as.avg_goals_for,
        2
      )}.`,
  });

  insights.push({
    title:
      "Over 1.5",

    text:
      `Partidas com pelo menos 2 gols ocorreram em ${percent(
        hs.over_1_5_rate
      )} dos jogos recentes de ${
        home.short_name ||
        home.name
      } e ${percent(
        as.over_1_5_rate
      )} dos jogos de ${
        away.short_name ||
        away.name
      }.`,
  });

  insights.push({
    title:
      "Ambas marcam",

    text:
      `Os dois times marcaram no mesmo jogo em ${percent(
        hs.btts_rate
      )} da amostra de ${
        home.short_name ||
        home.name
      } e ${percent(
        as.btts_rate
      )} da amostra de ${
        away.short_name ||
        away.name
      }.`,
  });

  return insights.slice(
    0,
    4
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
    location.state?.match ||
    null;


  /*
   * Estatísticas da partida.
   * Mantidas de forma independente
   * da forma recente.
   */
  const [
    data,
    setData,
  ] = useState(null);

  const [
    statsLoading,
    setStatsLoading,
  ] = useState(true);

  const [
    statsError,
    setStatsError,
  ] = useState("");


  /*
   * Forma recente.
   */
  const [
    formSample,
    setFormSample,
  ] = useState(5);

  const [
    formData,
    setFormData,
  ] = useState(null);

  const [
    formLoading,
    setFormLoading,
  ] = useState(
    matchId?.startsWith(
      "fd_"
    )
  );

  const [
    formError,
    setFormError,
  ] = useState("");


  const loadStats =
    useCallback(async () => {
      setStatsLoading(true);
      setStatsError("");

      try {
        const response =
          await api.get(
            `/match-stats/${matchId}`
          );

        setData(
          response.data
        );
      } catch (err) {
        setStatsError(
          err?.response?.data
            ?.detail ||
            "Não foi possível carregar os dados desta partida."
        );
      } finally {
        setStatsLoading(
          false
        );
      }
    }, [matchId]);


  const loadForm =
    useCallback(async () => {
      if (
        !matchId?.startsWith(
          "fd_"
        )
      ) {
        setFormData(null);
        setFormLoading(
          false
        );
        return;
      }

      setFormLoading(true);
      setFormError("");

      try {
        const response =
          await api.get(
            `/team-form/${matchId}`,
            {
              params: {
                last:
                  formSample,
              },
            }
          );

        setFormData(
          response.data
        );

        if (
          response.data
            ?.available ===
          false
        ) {
          setFormError(
            response.data
              ?.message ||
              "Forma recente indisponível."
          );
        }
      } catch (err) {
        setFormError(
          err?.response?.data
            ?.detail ||
            "Não foi possível carregar a forma recente."
        );
      } finally {
        setFormLoading(
          false
        );
      }
    }, [
      matchId,
      formSample,
    ]);


  useEffect(() => {
    loadStats();
  }, [loadStats]);


  useEffect(() => {
    loadForm();
  }, [loadForm]);


  const refresh =
    useCallback(() => {
      loadStats();
      loadForm();
    }, [
      loadStats,
      loadForm,
    ]);


  const match =
    data?.available
      ? data?.match ||
        null
      : null;

  const recentMatch =
    formData?.available
      ? formData?.match ||
        null
      : null;

  const prediction =
    data?.available
      ? data?.prediction ||
        null
      : null;

  const statistics =
    data?.available
      ? data?.statistics ||
        null
      : null;


  const homeName =
    match?.home?.name ||
    recentMatch?.home
      ?.name ||
    initialMatch?.home ||
    "Mandante";

  const awayName =
    match?.away?.name ||
    recentMatch?.away
      ?.name ||
    initialMatch?.away ||
    "Visitante";


  const homeLogo =
    match?.home?.logo ||
    recentMatch?.home
      ?.logo ||
    initialMatch?.home_logo;

  const awayLogo =
    match?.away?.logo ||
    recentMatch?.away
      ?.logo ||
    initialMatch?.away_logo;


  const competition =
    match?.competition
      ?.name ||
    recentMatch
      ?.competition ||
    initialMatch
      ?.competition;

  const competitionLogo =
    match?.competition
      ?.logo ||
    initialMatch
      ?.competition_logo;


  const kickoff =
    match?.kickoff ||
    recentMatch?.kickoff ||
    initialMatch?.kickoff;


  const kickoffFormatted =
    kickoff
      ? new Date(
          kickoff
        ).toLocaleString(
          "pt-BR",
          {
            weekday:
              "short",

            day: "2-digit",

            month:
              "2-digit",

            hour:
              "2-digit",

            minute:
              "2-digit",
          }
        )
      : null;


  const homeScore =
    match?.home?.score ??
    initialMatch
      ?.score_home;

  const awayScore =
    match?.away?.score ??
    initialMatch
      ?.score_away;

  const hasScore =
    homeScore != null ||
    awayScore != null;


  const status =
    match?.status ||
    initialMatch
      ?.status_raw ||
    initialMatch
      ?.status;

  const statusLabel =
    STATUS_LABELS[
      status
    ] ||
    match?.status_long ||
    initialMatch?.status;


  const predictionPercent =
    prediction?.percent ||
    {};

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


  const recentHome =
    formData?.available
      ? formData.home
      : null;

  const recentAway =
    formData?.available
      ? formData.away
      : null;


  const recentInsights =
    useMemo(
      () =>
        buildInsights(
          formData
        ),
      [formData]
    );


  const overallLoading =
    statsLoading ||
    formLoading;


  const noUsefulData =
    !overallLoading &&
    !initialMatch &&
    !match &&
    !recentMatch;


  if (noUsefulData) {
    return (
      <PublicLayout>
        <section className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white"
          >
            <ArrowLeft
              size={16}
            />
            Voltar
          </button>

          <div className="vs-card mt-6 p-8 md:p-10 text-center">
            <BarChart3
              size={34}
              className="text-[#CCFF00] mx-auto"
            />

            <h1 className="font-display text-3xl mt-5">
              Dados indisponíveis
            </h1>

            <p className="text-white/50 mt-3 max-w-lg mx-auto">
              Não foi possível
              localizar dados para
              esta partida.
            </p>
          </div>
        </section>
      </PublicLayout>
    );
  }


  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">

        {/* TOPBAR */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft
              size={16}
            />

            Voltar
          </button>

          <button
            onClick={refresh}
            disabled={
              overallLoading
            }
            className="flex items-center gap-2 text-xs text-white/40 hover:text-[#CCFF00] disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              size={14}
              className={
                overallLoading
                  ? "animate-spin"
                  : ""
              }
            />

            Atualizar
          </button>
        </div>


        {/* HEADER */}
        <div className="vs-card relative overflow-hidden p-5 md:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#CCFF00]/[0.055] to-transparent"
          />

          <div
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#CCFF00]/[0.025] blur-3xl"
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

              {match?.competition
                ?.round && (
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
              <div className="flex flex-col items-center min-w-0">
                <TeamLogo
                  src={homeLogo}
                  name={homeName}
                />

                <div className="font-display text-base md:text-xl text-center mt-3 leading-tight">
                  {homeName}
                </div>
              </div>

              <div className="text-center min-w-[72px] md:min-w-[110px]">
                {hasScore ? (
                  <div className="font-display text-4xl md:text-5xl">
                    {homeScore ??
                      0}

                    <span className="text-white/25 mx-2">
                      :
                    </span>

                    {awayScore ??
                      0}
                  </div>
                ) : (
                  <div>
                    <div className="font-display text-2xl md:text-3xl text-white/25">
                      VS
                    </div>
                  </div>
                )}

                {statusLabel && (
                  <div
                    className={`
                      mt-2
                      text-[9px]
                      uppercase
                      tracking-wider
                      ${
                        status ===
                          "1H" ||
                        status ===
                          "2H" ||
                        status ===
                          "HT" ||
                        status ===
                          "LIVE" ||
                        status ===
                          "HALFTIME"
                          ? "text-red-400"
                          : "text-white/35"
                      }
                    `}
                  >
                    {statusLabel}

                    {match
                      ?.elapsed !=
                      null &&
                      ` · ${match.elapsed}'`}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center min-w-0">
                <TeamLogo
                  src={awayLogo}
                  name={awayName}
                />

                <div className="font-display text-base md:text-xl text-center mt-3 leading-tight">
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

                  {
                    kickoffFormatted
                  }
                </div>
              )}

              {match?.venue
                ?.name && (
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


        {/* FORMA RECENTE */}
        <section className="mt-7">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
                <Trophy
                  size={13}
                />

                Radar recente
              </div>

              <h2 className="font-display text-2xl md:text-3xl mt-1">
                Forma dos times
              </h2>

              <p className="text-xs md:text-sm text-white/35 mt-1.5">
                Desempenho recente
                dentro da competição.
              </p>
            </div>

            {matchId?.startsWith(
              "fd_"
            ) && (
              <div className="inline-flex p-1 rounded-xl border border-white/[0.07] bg-black/30 self-start md:self-auto">
                {FORM_SAMPLES.map(
                  (sample) => (
                    <button
                      key={
                        sample
                      }
                      type="button"
                      onClick={() =>
                        setFormSample(
                          sample
                        )
                      }
                      disabled={
                        formLoading
                      }
                      className={`
                        min-w-[58px]
                        px-3 py-2
                        rounded-lg
                        text-xs
                        font-medium
                        transition-all
                        ${
                          formSample ===
                          sample
                            ? "bg-[#CCFF00] text-black"
                            : "text-white/45 hover:text-white hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      {sample}
                    </button>
                  )
                )}
              </div>
            )}
          </div>


          {formLoading &&
          !formData ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="vs-skeleton h-64" />
              <div className="vs-skeleton h-64" />
            </div>
          ) : formData?.available ? (
            <div className="grid md:grid-cols-2 gap-4">
              <TeamFormCard
                team={
                  recentHome
                }
              />

              <TeamFormCard
                team={
                  recentAway
                }
              />
            </div>
          ) : (
            <div className="vs-card p-6 text-center">
              <Trophy
                size={24}
                className="text-white/20 mx-auto"
              />

              <div className="text-sm text-white/45 mt-3">
                {formError ||
                  "A forma recente ainda não está disponível para esta partida."}
              </div>
            </div>
          )}
        </section>


        {/* LEITURA VÉRTICE */}
        {recentInsights.length >
          0 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
              <Sparkles
                size={13}
              />

              Inteligência Vértice
            </div>

            <h2 className="font-display text-2xl md:text-3xl mt-1">
              Leitura dos dados
            </h2>

            <p className="text-xs md:text-sm text-white/35 mt-1.5 mb-4">
              Tendências
              calculadas a partir
              da amostra selecionada.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {recentInsights.map(
                (
                  insight,
                  index
                ) => (
                  <InsightCard
                    key={
                      index
                    }
                    title={
                      insight.title
                    }
                    text={
                      insight.text
                    }
                  />
                )
              )}
            </div>
          </section>
        )}


        {/* COMPARATIVO RECENTE */}
        {recentHome &&
          recentAway && (
          <section className="mt-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
              <BarChart3
                size={13}
              />

              Comparativo
            </div>

            <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
              Desempenho recente
            </h2>

            <div className="vs-card p-5 md:p-6">
              <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3 pb-4 border-b border-white/[0.07]">
                <div className="text-xs font-semibold truncate">
                  {recentHome.short_name ||
                    recentHome.name}
                </div>

                <div className="text-[9px] text-center uppercase tracking-[0.18em] text-white/30">
                  Indicador
                </div>

                <div className="text-xs font-semibold text-right truncate">
                  {recentAway.short_name ||
                    recentAway.name}
                </div>
              </div>

              <RecentMetricRow
                label="Vitórias"
                home={
                  recentHome
                    .summary
                    ?.win_rate
                }
                away={
                  recentAway
                    .summary
                    ?.win_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Pontos / jogo"
                home={
                  recentHome
                    .summary
                    ?.points_per_game
                }
                away={
                  recentAway
                    .summary
                    ?.points_per_game
                }
                format="decimal"
              />

              <RecentMetricRow
                label="Gols marcados"
                home={
                  recentHome
                    .summary
                    ?.avg_goals_for
                }
                away={
                  recentAway
                    .summary
                    ?.avg_goals_for
                }
                format="decimal"
              />

              <RecentMetricRow
                label="Gols sofridos"
                home={
                  recentHome
                    .summary
                    ?.avg_goals_against
                }
                away={
                  recentAway
                    .summary
                    ?.avg_goals_against
                }
                format="decimal"
              />

              <RecentMetricRow
                label="Média total"
                home={
                  recentHome
                    .summary
                    ?.avg_total_goals
                }
                away={
                  recentAway
                    .summary
                    ?.avg_total_goals
                }
                format="decimal"
              />

              <RecentMetricRow
                label="Ambas marcam"
                home={
                  recentHome
                    .summary
                    ?.btts_rate
                }
                away={
                  recentAway
                    .summary
                    ?.btts_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Over 1.5"
                home={
                  recentHome
                    .summary
                    ?.over_1_5_rate
                }
                away={
                  recentAway
                    .summary
                    ?.over_1_5_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Over 2.5"
                home={
                  recentHome
                    .summary
                    ?.over_2_5_rate
                }
                away={
                  recentAway
                    .summary
                    ?.over_2_5_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Over 3.5"
                home={
                  recentHome
                    .summary
                    ?.over_3_5_rate
                }
                away={
                  recentAway
                    .summary
                    ?.over_3_5_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Clean sheets"
                home={
                  recentHome
                    .summary
                    ?.clean_sheet_rate
                }
                away={
                  recentAway
                    .summary
                    ?.clean_sheet_rate
                }
                format="percent"
              />

              <RecentMetricRow
                label="Sem marcar"
                home={
                  recentHome
                    .summary
                    ?.failed_to_score_rate
                }
                away={
                  recentAway
                    .summary
                    ?.failed_to_score_rate
                }
                format="percent"
              />
            </div>

            <div className="mt-2 text-[9px] text-white/20 text-center">
              Baseado nos últimos{" "}
              {formData?.sample ||
                formSample}{" "}
              jogos disponíveis de
              cada equipe na
              competição.
            </div>
          </section>
        )}


        {/* ÚLTIMOS JOGOS */}
        {recentHome &&
          recentAway && (
          <section className="mt-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
              <Target
                size={13}
              />

              Histórico recente
            </div>

            <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
              Últimos jogos
            </h2>

            <div className="grid lg:grid-cols-2 gap-4">
              <TeamRecentMatches
                team={
                  recentHome
                }
              />

              <TeamRecentMatches
                team={
                  recentAway
                }
              />
            </div>
          </section>
        )}


        {/* PREDICTIONS — MANTIDO PARA FUTURA COBERTURA */}
        {prediction && (
          <section className="mt-7">
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
                  label={
                    homeName
                  }
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
                  label={
                    awayName
                  }
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
                      Maior tendência:{" "}
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


        {/* ESTATÍSTICAS DA PARTIDA */}
        <section className="mt-7">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#CCFF00]">
            <BarChart3
              size={13}
            />

            Partida
          </div>

          <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
            Estatísticas do jogo
          </h2>

          {statsLoading &&
          !data ? (
            <div className="vs-skeleton h-56" />
          ) : statistics?.available ? (
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
                    row={
                      row
                    }
                  />
                )
              )}
            </div>
          ) : data
              ?.statistics_pending ? (
            <div className="vs-card p-7 md:p-9 text-center">
              <Clock3
                size={28}
                className="mx-auto text-[#CCFF00]"
              />

              <h3 className="font-display text-xl mt-4">
                Estatísticas em breve
              </h3>

              <p className="mt-2 text-sm text-white/45 max-w-xl mx-auto leading-relaxed">
                As estatísticas
                específicas desta
                partida são exibidas
                quando a fonte de
                dados disponibiliza
                informações do jogo.
                Enquanto isso, o
                Radar Recente acima
                utiliza os resultados
                oficiais da
                competição.
              </p>
            </div>
          ) : (
            <div className="vs-card p-7 md:p-9 text-center">
              <BarChart3
                size={27}
                className="mx-auto text-white/20"
              />

              <h3 className="font-display text-xl mt-4">
                Dados da partida ainda indisponíveis
              </h3>

              <p className="mt-2 text-sm text-white/40 max-w-xl mx-auto leading-relaxed">
                A fonte atual ainda
                não disponibilizou
                estatísticas
                específicas deste
                confronto. A análise
                de forma recente
                continua disponível
                normalmente acima.
              </p>
            </div>
          )}
        </section>


        {/* AVISOS DISCRETOS */}
        {(statsError ||
          formError) && (
          <div className="mt-5 pt-4 border-t border-white/[0.04] text-[9px] leading-relaxed text-white/20 text-center">
            Alguns conjuntos de
            dados podem variar
            conforme a cobertura da
            competição e da fonte
            utilizada.
          </div>
        )}

      </section>
    </PublicLayout>
  );
}